import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

/* Global database module. Exposes the Prisma connection pool once; every repository implementation */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
