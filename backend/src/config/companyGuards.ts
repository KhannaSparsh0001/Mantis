import { supabase } from '../config/supabase.ts';

interface CompanyInfo {
  id: string;
  role: string;
}

const memoCache = new Map<string, CompanyInfo[]>();

export function clearMemoCache(): void {
  memoCache.clear();
}

function getCacheKey(userId: string, requestId?: string): string {
  return requestId ? `${userId}:${requestId}` : userId;
}

export async function getUserCompanies(userId: string, requestId?: string): Promise<CompanyInfo[]> {
  if (!userId) return [];

  const cacheKey = getCacheKey(userId, requestId);
  const cached = memoCache.get(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', userId);

  if (error || !data) return [];

  const companies = data.map(c => ({ id: c.company_id, role: c.role }));
  memoCache.set(cacheKey, companies);
  return companies;
}

export async function checkCompanyAdmin(companyId: string, userId: string | null | undefined, requestId?: string): Promise<boolean> {
  if (!userId) return false;
  const companies = await getUserCompanies(userId, requestId);
  return companies.some(c => c.id === companyId && c.role === 'admin');
}

export async function checkCompanyMember(companyId: string, userId: string | null | undefined, requestId?: string): Promise<boolean> {
  if (!userId) return false;
  const companies = await getUserCompanies(userId, requestId);
  return companies.some(c => c.id === companyId);
}

export async function checkAnyCompanyAdmin(userId: string | null | undefined, requestId?: string): Promise<boolean> {
  if (!userId) return false;
  const companies = await getUserCompanies(userId, requestId);
  return companies.some(c => c.role === 'admin');
}

export async function checkAnyCompanyMember(userId: string | null | undefined, requestId?: string): Promise<boolean> {
  if (!userId) return false;
  const companies = await getUserCompanies(userId, requestId);
  return companies.length > 0;
}
