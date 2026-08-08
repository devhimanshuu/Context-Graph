import { Module } from '@nestjs/common'
import { IUsersRepository, UsersPrismaRepository } from './user.repository'
import { IUsersService, UsersService } from './user.service'
import { UsersController } from './user.controller'

/* Users module — owns user identity within tenants. */
@Module({
  controllers: [UsersController],
  providers: [
    { provide: IUsersRepository, useClass: UsersPrismaRepository },
    { provide: IUsersService, useClass: UsersService },
  ],
  exports: [IUsersRepository, IUsersService],
})
export class UsersModule {}
