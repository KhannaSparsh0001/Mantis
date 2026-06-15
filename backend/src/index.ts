import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { supabase } from './config/supabase.ts'
import { registerRoutes } from './routes/index.ts'

const { error: bucketError } = await supabase.storage.getBucket('product-assets')
if (bucketError) {
	const { error: createError } = await supabase.storage.createBucket('product-assets', {
		public: true,
	})
	if (createError) {
		console.error('Failed to create product-assets bucket:', createError.message)
	} else {
		console.log('Created product-assets storage bucket')
	}
}

export const app = new Elysia()
	.use(cors({
		origin: 'http://localhost:3000'
	}))
	.use(registerRoutes)
	.listen(8000)

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)