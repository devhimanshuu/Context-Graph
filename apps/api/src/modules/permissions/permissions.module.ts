import { Module } from '@nestjs/common'
import { IProfilesRepository, ProfilesPrismaRepository } from './permission.repository'
import { IPermissionService, PermissionService } from './permission.service'
import { PermissionsController } from './permission.controller'

/* Permissions module — permission profiles and their assignments. The */
@Module({
  controllers: [PermissionsController],
  providers: [
    { provide: IProfilesRepository, useClass: ProfilesPrismaRepository },
    { provide: IPermissionService, useClass: PermissionService },
  ],
  exports: [IPermissionService, IProfilesRepository],
})
export class PermissionsModule {}
