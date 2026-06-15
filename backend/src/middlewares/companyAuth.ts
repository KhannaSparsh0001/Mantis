import { Elysia } from 'elysia';
import { checkAnyCompanyAdmin, checkAnyCompanyMember, checkCompanyAdmin, checkCompanyMember } from '../config/companyGuards.ts';

export const requireCompanyAdmin = () => (app: Elysia) =>
  app
    .guard({
      as: 'scoped',
      beforeHandle: async ({ user, role, set }: any) => {
        if (!user) {
          set.status = 401;
          return { error: 'Unauthorized' };
        }
        if (role === 'admin') return;
        const isAdmin = await checkAnyCompanyAdmin(user.id);
        if (!isAdmin) {
          set.status = 403;
          return { error: 'Forbidden: Company admin access required' };
        }
      }
    });

export const requireCompanyMember = () => (app: Elysia) =>
  app
    .guard({
      as: 'scoped',
      beforeHandle: async ({ user, role, set }: any) => {
        if (!user) {
          set.status = 401;
          return { error: 'Unauthorized' };
        }
        if (role === 'admin') return;
        const isMember = await checkAnyCompanyMember(user.id);
        if (!isMember) {
          set.status = 403;
          return { error: 'Forbidden: Company membership required' };
        }
      }
    });

export const requireSameCompany = (companyId: string | null) => (app: Elysia) =>
  app
    .guard({
      as: 'scoped',
      beforeHandle: async ({ user, role, companies, set }: any) => {
        if (!user) {
          set.status = 401;
          return { error: 'Unauthorized' };
        }
        if (role === 'admin') return;
        if (!companyId) {
          set.status = 403;
          return { error: 'Forbidden: Only global admin can access unassociated records' };
        }
        const userCompanies = companies || [];
        const isMember = userCompanies.some((c: any) => c.id === companyId);
        if (!isMember) {
          set.status = 403;
          return { error: 'Forbidden: You do not belong to this company' };
        }
      }
    });

export const requireCompanyAdminOf = (companyId: string | null) => (app: Elysia) =>
  app
    .guard({
      as: 'scoped',
      beforeHandle: async ({ user, role, set }: any) => {
        if (!user) {
          set.status = 401;
          return { error: 'Unauthorized' };
        }
        if (role === 'admin') return;
        if (!companyId) {
          set.status = 403;
          return { error: 'Forbidden: Only global admin can access unassociated records' };
        }
        const isAdmin = await checkCompanyAdmin(companyId, user.id);
        if (!isAdmin) {
          set.status = 403;
          return { error: 'Forbidden: Company admin access required for this company' };
        }
      }
    });
