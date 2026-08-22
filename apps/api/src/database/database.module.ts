import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

/* Global database module. Exposes the Prisma connection pool once; every repository implementation */
@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: 'PRISMA',
      useExisting: PrismaService,
    },
  ],
  exports: [PrismaService, 'PRISMA'],
})
export class DatabaseModule {}
