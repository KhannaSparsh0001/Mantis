# Auth Implementation Context

## Objective
Implement Supabase SSR authentication with three roles:
- Admin (Google OAuth, whitelisted emails)
- Company (Google OAuth, whitelisted emails)
- User (Email/Password, self-signup)

## Architecture
- Frontend: Supabase SSR with cookies + Next.js middleware
- Backend: Elysia middleware verifying JWT via Supabase Admin
- Roles: user_roles table in Supabase (user_id, role enum)

## Key Decisions
- Using Supabase SSR pattern (@supabase/ssr) for session management
- Google OAuth for Admin/Company roles (manually whitelisted emails)
- Email/password for User role (self-service signup)
- Frontend middleware protects routes before component render
- Backend middleware protects API endpoints
- Roles assigned on first login via auth trigger

## State
- Plan created
- Ready for refinement
