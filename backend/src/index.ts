import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'

const app = new Elysia()
	.use(cors({
		origin: 'http://localhost:3000'
	}))
	.get('/', () => 'Hello Elysia')
	.get('/api/products', () => {
		return [
			{ id: "xiaomi-scooter-4-pro", name: "Xiaomi Mi Electric Scooter 4 Pro", category: "Electric Scooters" }
		];
	})
	.listen(8000)

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)