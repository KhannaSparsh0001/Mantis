import { Elysia, t } from 'elysia';
import { supabase } from '../config/supabase.ts';
import { optionalAuth } from '../middlewares/auth.ts';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export const invitationRoutes = new Elysia()
  .post('/api/invitations/view', async ({ body, request, set }) => {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { token } = body as { token: string };

    if (!checkRateLimit(`invite_ip:${ip}`, 5, 60000)) {
      set.status = 429;
      return { error: 'Too many requests. Please try again later.' };
    }

    if (!checkRateLimit(`invite_token:${token}`, 5, 60000)) {
      set.status = 429;
      return { error: 'Too many requests. Please try again later.' };
    }

    const { data: invitation, error } = await supabase
      .from('company_invitations')
      .select('*, companies:company_id(name, slug)')
      .eq('token', token)
      .maybeSingle();

    if (error || !invitation) {
      set.status = 404;
      return { error: 'Invitation not found or expired.' };
    }

    if (new Date(invitation.expires_at) < new Date()) {
      set.status = 404;
      return { error: 'Invitation not found or expired.' };
    }

    return {
      companyName: invitation.companies?.name || 'Unknown Company',
      companySlug: invitation.companies?.slug || '',
      role: invitation.role,
      expiresAt: invitation.expires_at,
      accepted: invitation.accepted,
    };
  }, {
    body: t.Object({
      token: t.String(),
    })
  })
  .guard({ as: 'scoped' }, app =>
    optionalAuth()(app)
      .post('/api/invitations/accept', async ({ body, user, set }) => {
        const { token } = body as { token: string };

        if (!user) {
          set.status = 401;
          return { error: 'Must be logged in to accept an invitation.' };
        }

        const { data: invitation, error } = await supabase
          .from('company_invitations')
          .select('*')
          .eq('token', token)
          .maybeSingle();

        if (error || !invitation) {
          set.status = 404;
          return { error: 'Invitation not found or expired.' };
        }

        if (new Date(invitation.expires_at) < new Date()) {
          set.status = 404;
          return { error: 'Invitation not found or expired.' };
        }

        if (invitation.accepted) {
          set.status = 409;
          return { error: 'Invitation already accepted.' };
        }

        if (invitation.email !== user.email) {
          set.status = 403;
          return { error: 'This invitation was sent to a different email address.' };
        }

        const { data: existingMember } = await supabase
          .from('company_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('company_id', invitation.company_id)
          .maybeSingle();

        if (existingMember) {
          set.status = 409;
          return { error: 'Already a member of this company.' };
        }

        const { error: memberError } = await supabase
          .from('company_members')
          .insert({ user_id: user.id, company_id: invitation.company_id, role: invitation.role });

        if (memberError) {
          set.status = 400;
          return { error: memberError.message };
        }

        const { error: updateError } = await supabase
          .from('company_invitations')
          .update({ accepted: true })
          .eq('id', invitation.id);

        if (updateError) {
          set.status = 400;
          return { error: updateError.message };
        }

        return { success: true, message: 'Successfully joined the company.' };
      }, {
        body: t.Object({
          token: t.String(),
        })
      })
  );
