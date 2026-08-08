import { Module } from '@nestjs/common'
import { IDepartmentsRepository, DepartmentsPrismaRepository } from './department.repository'
import { IDepartmentsService, DepartmentsService } from './department.service'
import { DepartmentsController } from './department.controller'

@Module({
  controllers: [DepartmentsController],
  providers: [
    { provide: IDepartmentsRepository, useClass: DepartmentsPrismaRepository },
    { provide: IDepartmentsService, useClass: DepartmentsService },
  ],
  exports: [IDepartmentsRepository, IDepartmentsService],
})
export class DepartmentsModule {}
