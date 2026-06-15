import { Elysia, t } from 'elysia';
import { supabase } from '../config/supabase.ts';
import { requireAdmin } from '../middlewares/auth.ts';

export const adminRoutes = new Elysia()
  .guard({ as: 'scoped' }, app =>
    requireAdmin()(app)
      .post('/api/admin/companies', async ({ body, user, set }) => {
        const { name, slug } = body as { name: string; slug: string };

        if (slug === 'legacy') {
          set.status = 409;
          return { error: 'The slug "legacy" is reserved and cannot be used.' };
        }

        if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
          set.status = 400;
          return { error: 'Slug must be non-empty and contain only lowercase alphanumeric characters and hyphens.' };
        }

        const { data: existing } = await supabase
          .from('companies')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        if (existing) {
          set.status = 409;
          return { error: 'A company with this slug already exists.' };
        }

        const { data: company, error } = await supabase
          .from('companies')
          .insert({ name, slug, created_by: user!.id })
          .select()
          .single();

        if (error) {
          set.status = 400;
          return { error: error.message };
        }

        const { error: memberError } = await supabase
          .from('company_members')
          .insert({ user_id: user!.id, company_id: company.id, role: 'admin' });

        if (memberError) {
          set.status = 400;
          return { error: memberError.message };
        }

        set.status = 201;
        return company;
      }, {
        body: t.Object({
          name: t.String(),
          slug: t.String(),
        })
      })
      .get('/api/admin/companies', async ({ query, set }) => {
        const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
        const offset = Math.max(Number(query.offset) || 0, 0);

        const { data: companies, error } = await supabase
          .from('companies')
          .select('*, member_count:company_members(count)')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          set.status = 400;
          return { error: error.message };
        }

        const { count } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true });

        return { data: companies || [], total: count || 0, limit, offset };
      }, {
        query: t.Object({
          limit: t.Optional(t.String()),
          offset: t.Optional(t.String()),
        })
      })
      .post('/api/admin/companies/:id/members', async ({ params, body, set }) => {
        const { id } = params;
        const { userId } = body as { userId: string };

        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('id', id)
          .maybeSingle();

        if (!company) {
          set.status = 404;
          return { error: 'Company not found.' };
        }

        const { data: existing } = await supabase
          .from('company_members')
          .select('id')
          .eq('user_id', userId)
          .eq('company_id', id)
          .maybeSingle();

        if (existing) {
          set.status = 409;
          return { error: 'User is already a member of this company.' };
        }

        const { data: member, error } = await supabase
          .from('company_members')
          .insert({ user_id: userId, company_id: id, role: 'admin' })
          .select()
          .single();

        if (error) {
          set.status = 400;
          return { error: error.message };
        }

        set.status = 201;
        return member;
      }, {
        params: t.Object({
          id: t.String(),
        }),
        body: t.Object({
          userId: t.String(),
        })
      })
      .delete('/api/admin/companies/:id', async ({ params, body, set }) => {
        const { id } = params;
        const { confirm } = body as { confirm?: boolean };

        if (!confirm) {
          set.status = 400;
          return { error: 'Confirmation required. Set confirm: true to proceed.' };
        }

        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('id', id)
          .maybeSingle();

        if (!company) {
          set.status = 404;
          return { error: 'Company not found.' };
        }

        const { count: productCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', id);

        if (productCount && productCount > 0) {
          set.status = 409;
          return { error: `Company has ${productCount} product(s). Remove or reassign them first.`, productCount };
        }

        await supabase
          .from('company_members')
          .delete()
          .eq('company_id', id);

        const { error } = await supabase
          .from('companies')
          .delete()
          .eq('id', id);

        if (error) {
          set.status = 400;
          return { error: error.message };
        }

        return { success: true };
      }, {
        params: t.Object({
          id: t.String(),
        }),
        body: t.Object({
          confirm: t.Optional(t.Boolean()),
        })
      })
  );
