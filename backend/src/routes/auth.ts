import { Elysia } from 'elysia';
import { supabase } from '../config/supabase.ts';
import { getUserRole } from '../config/userRoles.ts';
import { requireAnyAuth } from '../middlewares/auth.ts';

export const authRoutes = new Elysia()
  .guard({ as: 'scoped' }, app =>
    requireAnyAuth()(app)
      .get('/api/auth/me', async ({ user }) => {
        const role = await getUserRole(supabase, user!.id, user!.email);

        const { data: memberships } = await supabase
          .from('company_members')
          .select('company_id, role')
          .eq('user_id', user!.id);

        let companies: Array<{ id: string; name: string; slug: string; role: string }> = [];
        if (memberships && memberships.length > 0) {
          const companyIds = memberships.map(m => m.company_id);
          const { data: companyData } = await supabase
            .from('companies')
            .select('id, name, slug')
            .in('id', companyIds);

          if (companyData) {
            const roleMap = new Map(memberships.map(m => [m.company_id, m.role]));
            companies = companyData.map(c => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              role: roleMap.get(c.id) || 'member',
            }));
          }
        }

        return {
          id: user!.id,
          email: user!.email,
          role,
          created_at: user!.created_at,
          companies,
        };
      })
  );
