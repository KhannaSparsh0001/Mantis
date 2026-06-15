import { Elysia, t } from 'elysia';
import { supabase } from '../config/supabase.ts';
import { requireAnyAuth } from '../middlewares/auth.ts';

export const conversationRoutes = new Elysia()
  .guard({ as: 'scoped' }, app =>
    requireAnyAuth()(app)
      .get('/api/conversations', async ({ query, user, set }) => {
        const limit = Math.min(Math.max(parseInt(query.limit as string) || 50, 1), 100);
        const offset = Math.max(parseInt(query.offset as string) || 0, 0);

        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user!.id)
          .order('updated_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          set.status = 500;
          return { error: error.message };
        }

        return data || [];
      }, {
        query: t.Object({
          limit: t.Optional(t.String()),
          offset: t.Optional(t.String()),
        }),
      })
      .post('/api/conversations', async ({ body, user, set }) => {
        const { productId } = body;

        const { data, error } = await supabase
          .from('conversations')
          .insert({
            user_id: user!.id,
            product_id: productId || null,
          })
          .select()
          .single();

        if (error) {
          set.status = 500;
          return { error: error.message };
        }

        set.status = 201;
        return data;
      }, {
        body: t.Object({
          productId: t.Optional(t.String()),
        }),
      })
      .patch('/api/conversations/:id', async ({ params, body, user, set }) => {
        const { id } = params;
        const { title } = body;

        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('id', id)
          .eq('user_id', user!.id)
          .maybeSingle();

        if (!existing) {
          set.status = 404;
          return { error: 'Conversation not found' };
        }

        const { data, error } = await supabase
          .from('conversations')
          .update({ title })
          .eq('id', id)
          .eq('user_id', user!.id)
          .select()
          .single();

        if (error) {
          set.status = 500;
          return { error: error.message };
        }

        return data;
      }, {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          title: t.String({ maxLength: 120 }),
        }),
      })
      .delete('/api/conversations/:id', async ({ params, user, set }) => {
        const { id } = params;

        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('id', id)
          .eq('user_id', user!.id)
          .maybeSingle();

        if (!existing) {
          set.status = 404;
          return { error: 'Conversation not found' };
        }

        const { error } = await supabase
          .from('conversations')
          .delete()
          .eq('id', id)
          .eq('user_id', user!.id);

        if (error) {
          set.status = 500;
          return { error: error.message };
        }

        set.status = 204;
      }, {
        params: t.Object({ id: t.String() }),
      })
  );
