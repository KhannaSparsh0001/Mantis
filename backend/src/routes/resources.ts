import { Elysia, t } from 'elysia';
import { supabase } from '../config/supabase.ts';
import { authDerive, requireCompanyMember } from '../middlewares/auth.ts';

export const resourceRoutes = new Elysia()
  .get('/api/products/:id/resources', async ({ params, set }) => {
    const { id } = params;

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (productError || !product) {
      set.status = 404;
      return { error: 'Product not found.' };
    }

    const { data: resources, error: resourcesError } = await supabase
      .from('product_resources')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false });

    if (resourcesError) {
      set.status = 500;
      return { error: resourcesError.message };
    }

    return { resources: resources || [] };
  }, {
    params: t.Object({ id: t.String() }),
  })
  .guard({ as: 'scoped' }, app =>
    app.use(authDerive)
      .guard({ as: 'scoped' }, app2 =>
        requireCompanyMember()(app2)
          .post('/api/products/:id/resources', async ({ params, body, user, set }) => {
            const { id } = params;
            const { type, title, url, file } = body;

            const { data: product, error: productError } = await supabase
              .from('products')
              .select('company_id')
              .eq('id', id)
              .maybeSingle();

            if (productError || !product) {
              set.status = 404;
              return { error: 'Product not found.' };
            }

            if (product.company_id) {
              const { data: membership } = await supabase
                .from('company_members')
                .select('id')
                .eq('user_id', user!.id)
                .eq('company_id', product.company_id)
                .maybeSingle();

              if (!membership && user!.role !== 'admin') {
                set.status = 403;
                return { error: 'Forbidden: You do not belong to this product\'s company.' };
              }
            } else if (user!.role !== 'admin') {
              set.status = 403;
              return { error: 'Forbidden: Only admin can manage resources for unassociated products.' };
            }

            if (type !== 'link') {
              if (!file) {
                set.status = 400;
                return { error: 'File is required for non-link resources.' };
              }

              let contentType = 'application/octet-stream';
              if (type === 'pdf') contentType = 'application/pdf';
              else if (type === 'image') contentType = 'image/*';
              else if (type === 'video') contentType = 'video/*';

              const filename = file.name || `${Date.now()}`;
              const storagePath = `resources/${id}/${Date.now()}-${filename}`;

              const buffer = await file.arrayBuffer();
              const { error: uploadError } = await supabase.storage
                .from('product-assets')
                .upload(storagePath, buffer, { contentType, upsert: true });

              if (uploadError) {
                set.status = 500;
                return { error: `Storage upload failed: ${uploadError.message}` };
              }

              const { data: publicUrlData } = supabase.storage
                .from('product-assets')
                .getPublicUrl(storagePath);
              const resourceUrl = publicUrlData.publicUrl;
              const resourceTitle = title || filename;
              const fileSize = file.size || 0;

              const { error: insertError } = await supabase
                .from('product_resources')
                .insert({
                  product_id: id,
                  type,
                  url: resourceUrl,
                  title: resourceTitle,
                  size: fileSize,
                });

              if (insertError) {
                set.status = 500;
                return { error: `Database insert failed: ${insertError.message}` };
              }

              set.status = 201;
              return { success: true, resource: { type, url: resourceUrl, title: resourceTitle, size: fileSize } };
            }

            if (!url) {
              set.status = 400;
              return { error: 'URL is required for link resources.' };
            }

            const resourceTitle = title || url;

            const { error: insertError } = await supabase
              .from('product_resources')
              .insert({
                product_id: id,
                type: 'link',
                url,
                title: resourceTitle,
              });

            if (insertError) {
              set.status = 500;
              return { error: `Database insert failed: ${insertError.message}` };
            }

            set.status = 201;
            return { success: true, resource: { type: 'link', url, title: resourceTitle } };
          }, {
            params: t.Object({ id: t.String() }),
            body: t.Object({
              type: t.String(),
              title: t.Optional(t.String()),
              url: t.Optional(t.String()),
              file: t.Optional(t.Any()),
            }),
          })
          .delete('/api/products/:id/resources/:resourceId', async ({ params, set }) => {
            const { id, resourceId } = params;

            const { data: resource, error: resourceError } = await supabase
              .from('product_resources')
              .select('*')
              .eq('id', resourceId)
              .eq('product_id', id)
              .maybeSingle();

            if (resourceError || !resource) {
              set.status = 404;
              return { error: 'Resource not found.' };
            }

            const { error: deleteError } = await supabase
              .from('product_resources')
              .delete()
              .eq('id', resourceId);

            if (deleteError) {
              set.status = 500;
              return { error: deleteError.message };
            }

            if (resource.type !== 'link' && resource.url) {
              try {
                const urlObj = new URL(resource.url);
                const pathParts = urlObj.pathname.split('/public/product-assets/');
                if (pathParts.length > 1) {
                  const storagePath = pathParts[1];
                  await supabase.storage.from('product-assets').remove([storagePath!]);
                }
              } catch (e: any) {
                console.warn('Failed to delete file from storage:', e.message || e);
              }
            }

            return { success: true };
          }, {
            params: t.Object({ id: t.String(), resourceId: t.String() }),
          })
      )
  );
