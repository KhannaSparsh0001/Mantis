import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_API_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_API_KEY in .env');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_USERS = [
  {
    email: 'admin@mantis.demo',
    password: 'admin123456',
    role: 'admin',
    label: 'Superadmin',
  },
  {
    email: 'company@mantis.demo',
    password: 'company123456',
    role: 'user',
    label: 'Company Admin',
  },
];

const DEMO_COMPANY = {
  name: 'Demo Outdoors Co.',
  slug: 'demo-outdoors',
};

async function ensureUser(email: string, password: string) {
  // Check if user already exists
  const { data: users } = await sb.auth.admin.listUsers();
  const existing = users?.users.find((u) => u.email === email);
  if (existing) {
    console.log(`  ✓ Already exists: ${email} (${existing.id})`);
    return existing;
  }

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    // Some Supabase plans restrict admin createUser; try alternate approach
    console.warn(`  ⚠ Could not create ${email}: ${error.message}`);
    console.warn(`    → Sign up manually at /login, then re-run seed.`);
    return null;
  }

  console.log(`  ✓ Created: ${email} (${data.user.id})`);
  return data.user;
}

async function ensureRole(userId: string, email: string, role: string) {
  const { error } = await sb
    .from('user_roles')
    .upsert({ user_id: userId, role }, { onConflict: 'user_id' });

  if (error) {
    console.error(`  ✗ Failed to set role for ${email}: ${error.message}`);
  } else {
    console.log(`  ✓ Role set: ${email} → ${role}`);
  }
}

async function ensureCompany() {
  const { data: existing } = await sb
    .from('companies')
    .select('id')
    .eq('slug', DEMO_COMPANY.slug)
    .single();

  if (existing) {
    console.log(`  ✓ Company already exists: ${DEMO_COMPANY.name} (${existing.id})`);
    return existing;
  }

  const { data, error } = await sb
    .from('companies')
    .insert({
      name: DEMO_COMPANY.name,
      slug: DEMO_COMPANY.slug,
    })
    .select('id')
    .single();

  if (error) {
    console.error(`  ✗ Failed to create company: ${error.message}`);
    return null;
  }

  console.log(`  ✓ Company created: ${DEMO_COMPANY.name} (${data.id})`);
  return data;
}

async function ensureCompanyMember(userId: string, companyId: string, role: string) {
  const { error } = await sb
    .from('company_members')
    .upsert(
      { user_id: userId, company_id: companyId, role },
      { onConflict: 'user_id,company_id' },
    );

  if (error) {
    console.error(`  ✗ Failed to add member: ${error.message}`);
  } else {
    console.log(`  ✓ Added to company: ${userId} → ${DEMO_COMPANY.name} as ${role}`);
  }
}

async function main() {
  console.log('\n🚀 Seeding mock accounts…\n');

  // 1. Create users via Supabase Admin API
  const users: { id: string; email: string; label: string; role: string }[] = [];
  for (const u of SEED_USERS) {
    const user = await ensureUser(u.email, u.password);
    if (user) {
      users.push({ id: user.id, email: u.email, label: u.label, role: u.role });
    }
  }

  // 2. Assign global roles
  for (const u of users) {
    await ensureRole(u.id, u.email, u.role);
  }

  // 3. Create demo company
  const company = await ensureCompany();

  // 4. Add company admin to demo company
  const companyAdmin = users.find((u) => u.email === 'company@mantis.demo');
  if (companyAdmin && company) {
    await ensureCompanyMember(companyAdmin.id, company.id, 'admin');
  }

  console.log('\n✅ Seed complete.\n');
  console.log('Mock accounts:');
  console.log('  Superadmin:   admin@mantis.demo / admin123456');
  console.log('  Company Admin: company@mantis.demo / company123456');
  console.log('  Demo Company:  Demo Outdoors Co.\n');
  console.log('Tip: Set AUTH_EMAIL_WHITELIST in .env for automatic role assignment on login.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
