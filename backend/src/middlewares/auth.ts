import { Elysia } from 'elysia';
import { supabase } from '../config/supabase.ts';
import { getUserRole } from '../config/userRoles.ts';
import { getUserCompanies } from '../config/companyGuards.ts';

export const authDerive = new Elysia({ name: 'auth-derive' })
  .derive({ as: 'scoped' }, async ({ request, set }) => {
    const authHeader = request.headers.get('authorization');

    if (authHeader && !authHeader.startsWith('Bearer ')) {
      set.status = 400;
      return { user: null, role: null, companies: [] };
    }

    if (!authHeader) {
      return { user: null, role: null, companies: [] };
    }

    const token = authHeader.slice(7);
    if (!token) {
      return { user: null, role: null, companies: [] };
    }

    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        return { user: null, role: null, companies: [] };
      }
      const role = await getUserRole(supabase, data.user.id, data.user.email);
      const companies = await getUserCompanies(data.user.id);
      return { user: data.user, role, companies };
    } catch {
      set.status = 503;
      return { user: null, role: null, companies: [] };
    }
  });

export const optionalAuth = () => (app: Elysia) => app.use(authDerive);

export const requireAnyAuth = () => (app: Elysia) =>
  app
    .use(authDerive)
    .guard({
      as: 'scoped',
      beforeHandle: ({ user, role, set }) => {
        if (!user) {
          const message = set.status === 503
            ? 'Authentication service unavailable'
            : set.status === 400
              ? 'Malformed authorization header'
              : 'Unauthorized';
          if (set.status < 400) set.status = 401;
          return { error: message };
        }
      }
    });

export const requireCompany = () => (app: Elysia) =>
  app
    .use(authDerive)
    .guard({
      as: 'scoped',
      beforeHandle: ({ user, role, set }) => {
        if (!user) {
          const message = set.status === 503
            ? 'Authentication service unavailable'
            : set.status === 400
              ? 'Malformed authorization header'
              : 'Unauthorized';
          if (set.status < 400) set.status = 401;
          return { error: message };
        }
        if (role !== 'company' && role !== 'admin') {
          set.status = 403;
          return { error: 'Forbidden: Company access required' };
        }
      }
    });

export const requireAdmin = () => (app: Elysia) =>
  app
    .use(authDerive)
    .guard({
      as: 'scoped',
      beforeHandle: ({ user, role, set }) => {
        if (!user) {
          const message = set.status === 503
            ? 'Authentication service unavailable'
            : set.status === 400
              ? 'Malformed authorization header'
              : 'Unauthorized';
          if (set.status < 400) set.status = 401;
          return { error: message };
        }
        if (role !== 'admin') {
          set.status = 403;
          return { error: 'Forbidden: Admin access required' };
        }
      }
    });

export { requireCompanyAdmin, requireCompanyMember, requireSameCompany, requireCompanyAdminOf } from './companyAuth.ts';
