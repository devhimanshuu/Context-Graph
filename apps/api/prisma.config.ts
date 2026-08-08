import 'dotenv/config'
import { defineConfig } from 'prisma/config'

/* Prisma configuration (Prisma 6.19+). Centralizes: schema location, migrations directory, and the seed command. */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
})
