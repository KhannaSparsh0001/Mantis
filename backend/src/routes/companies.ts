import { Elysia, t } from 'elysia';
import { supabase } from '../config/supabase.ts';
import { requireAnyAuth } from '../middlewares/auth.ts';
import crypto from 'crypto';

export const companyRoutes = new Elysia()
  .guard({ as: 'scoped' }, app =>
    requireAnyAuth()(app)
      .get('/api/companies/mine', async ({ user, set }) => {
        const { data: memberships, error } = await supabase
          .from('company_members')
          .select('company_id, role')
          .eq('user_id', user!.id);

        if (error || !memberships || memberships.length === 0) {
          return [];
        }

        const companyIds = memberships.map(m => m.company_id);
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, slug')
          .in('id', companyIds);

        if (!companies) return [];

        const roleMap = new Map(memberships.map(m => [m.company_id, m.role]));

        const result = await Promise.all(companies.map(async (c) => {
          const { count } = await supabase
            .from('company_members')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', c.id);

          return {
            id: c.id,
            name: c.name,
            slug: c.slug,
            role: roleMap.get(c.id) || 'member',
            memberCount: count || 0,
          };
        }));

        return result;
      })
  )
  .guard({ as: 'scoped' }, app =>
    requireAnyAuth()(app)
      .get('/api/companies/:id/members', async ({ params, user, set }) => {
        const { id } = params;

        const isAdmin = await supabase
          .from('company_members')
          .select('role')
          .eq('user_id', user!.id)
          .eq('company_id', id)
          .eq('role', 'admin')
          .maybeSingle();

        if ((!isAdmin || !isAdmin.data) && user!.role !== 'admin') {
          set.status = 403;
          return { error: 'Forbidden: Company admin access required for this company' };
        }

        const { data: members, error } = await supabase
          .from('company_members')
          .select('id, user_id, role, created_at')
          .eq('company_id', id)
          .order('created_at', { ascending: true });

        if (error) {
          set.status = 400;
          return { error: error.message };
        }

        return members || [];
      }, {
        params: t.Object({
          id: t.String(),
        })
      })
      .post('/api/companies/:id/members', async ({ params, body, user, set }) => {
        const { id } = params;
        const { userId, role: memberRole } = body as { userId: string; role?: string };

        const assignRole = memberRole === 'admin' ? 'admin' : 'member';

        const isAdmin = await supabase
          .from('company_members')
          .select('role')
          .eq('user_id', user!.id)
          .eq('company_id', id)
          .eq('role', 'admin')
          .maybeSingle();

        if ((!isAdmin || !isAdmin.data) && user!.role !== 'admin') {
          set.status = 403;
          return { error: 'Forbidden: Company admin access required for this company' };
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

        const { error } = await supabase
          .from('company_members')
          .insert({ user_id: userId, company_id: id, role: assignRole });

        if (error) {
          set.status = 400;
          return { error: error.message };
        }

        set.status = 201;
        return { success: true, role: assignRole };
      }, {
        params: t.Object({
          id: t.String(),
        }),
        body: t.Object({
          userId: t.String(),
          role: t.Optional(t.String()),
        })
      })
      .post('/api/companies/:id/invitations', async ({ params, body, user, set }) => {
        const { id } = params;
        const { email, role: inviteRole } = body as { email: string; role: string };

        if (inviteRole !== 'admin' && inviteRole !== 'member') {
          set.status = 400;
          return { error: 'Role must be "admin" or "member".' };
        }

        const isAdmin = await supabase
          .from('company_members')
          .select('role')
          .eq('user_id', user!.id)
          .eq('company_id', id)
          .eq('role', 'admin')
          .maybeSingle();

        if ((!isAdmin || !isAdmin.data) && user!.role !== 'admin') {
          set.status = 403;
          return { error: 'Forbidden: Company admin access required for this company' };
        }

        const tokenBuffer = crypto.randomBytes(32);
        const token = tokenBuffer.toString('hex');

        const { data: existingMember } = await supabase
          .from('company_members')
          .select('id')
          .eq('company_id', id)
          .eq('user_id', user!.id);

        const { data: existingInvitation } = await supabase
          .from('company_invitations')
          .select('id')
          .eq('company_id', id)
          .eq('email', email.toLowerCase())
          .eq('accepted', false)
          .maybeSingle();

        if (existingInvitation) {
          console.log(`Invitation already pending for ${email} in company ${id}`);
          return { success: true, message: 'Invitation sent.' };
        }

        const { error: inviteError } = await supabase
          .from('company_invitations')
          .insert({
            company_id: id,
            email: email.toLowerCase(),
            role: inviteRole,
            invited_by: user!.id,
            token,
          });

        if (inviteError) {
          set.status = 400;
          return { error: inviteError.message };
        }

        console.log(`[INVITATION] Token for ${email} -> company ${id}: ${token}`);

        return { success: true, message: 'Invitation sent.' };
      }, {
        params: t.Object({
          id: t.String(),
        }),
        body: t.Object({
          email: t.String(),
          role: t.String(),
        })
      })
      .delete('/api/companies/:id/members/:userId', async ({ params, user, set }) => {
        const { id, userId } = params;

        if (userId === user!.id) {
          set.status = 400;
          return { error: 'Cannot remove yourself from the company.' };
        }

        const isRequestorAdmin = await supabase
          .from('company_members')
          .select('role')
          .eq('user_id', user!.id)
          .eq('company_id', id)
          .eq('role', 'admin')
          .maybeSingle();

        if ((!isRequestorAdmin || !isRequestorAdmin.data) && user!.role !== 'admin') {
          set.status = 403;
          return { error: 'Forbidden: Company admin access required for this company' };
        }

        const { data: targetMember } = await supabase
          .from('company_members')
          .select('id, role')
          .eq('user_id', userId)
          .eq('company_id', id)
          .maybeSingle();

        if (!targetMember) {
          set.status = 404;
          return { error: 'Member not found.' };
        }

        const { count: adminCount } = await supabase
          .from('company_members')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', id)
          .eq('role', 'admin');

        if (adminCount !== null && adminCount <= 1 && targetMember.role === 'admin') {
          set.status = 409;
          return { error: 'Cannot remove the last company admin; promote another member first.' };
        }

        const { error: deleteError } = await supabase
          .from('company_members')
          .delete()
          .eq('user_id', userId)
          .eq('company_id', id);

        if (deleteError) {
          set.status = 400;
          return { error: deleteError.message };
        }

        return { success: true };
      }, {
        params: t.Object({
          id: t.String(),
          userId: t.String(),
        })
      })
  );
