-- Multi-Company Authorization Migration
-- Creates companies, company_members, company_invitations tables
-- Alters user_roles CHECK constraint to remove 'company'
-- Adds company_id to products
-- Migrates legacy 'company' role users into a catch-all "Legacy Users" company

BEGIN;

-- 1. Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Create company_members table
CREATE TABLE IF NOT EXISTS public.company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- 3. Create company_invitations table
CREATE TABLE IF NOT EXISTS public.company_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  invited_by UUID REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_company_invitations_lookup
  ON public.company_invitations(company_id, email, accepted);

-- 4. Alter user_roles CHECK constraint
-- Drop old CHECK (role IN ('admin', 'company', 'user'))
-- Add new CHECK (role IN ('admin', 'user'))
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'user'));

-- 5. Add company_id to products (nullable FK, ON DELETE SET NULL)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- 6. Data migration: handle legacy 'company' role users
-- The slug 'legacy' is reserved — no user-created company may use it.
-- This is enforced at the route layer (POST /api/admin/companies validates slug != 'legacy').
DO $$
DECLARE
  legacy_company_id UUID;
  legacy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO legacy_count FROM public.user_roles WHERE role = 'company';

  IF legacy_count > 0 THEN
    INSERT INTO public.companies (name, slug, created_by)
    VALUES ('Legacy Users', 'legacy', NULL)
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO legacy_company_id;

    IF legacy_company_id IS NULL THEN
      SELECT id INTO legacy_company_id FROM public.companies WHERE slug = 'legacy';
    END IF;

    INSERT INTO public.company_members (user_id, company_id, role)
    SELECT user_id, legacy_company_id, 'admin'
    FROM public.user_roles
    WHERE role = 'company'
    ON CONFLICT (user_id, company_id) DO NOTHING;

    UPDATE public.user_roles SET role = 'user' WHERE role = 'company';
  END IF;
END $$;

COMMIT;
