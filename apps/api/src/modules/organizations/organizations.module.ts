import { Module } from '@nestjs/common'
import { IOrganizationsRepository, OrganizationsPrismaRepository } from './organization.repository'
import { IOrganizationsService, OrganizationsService } from './organization.service'
import { OrganizationsController } from './organization.controller'

@Module({
  controllers: [OrganizationsController],
  providers: [
    { provide: IOrganizationsRepository, useClass: OrganizationsPrismaRepository },
    { provide: IOrganizationsService, useClass: OrganizationsService },
  ],
  exports: [IOrganizationsRepository, IOrganizationsService],
})
export class OrganizationsModule {}
