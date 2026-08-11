import { Injectable } from '@nestjs/common'
import { NotFoundException } from '../../common/exceptions/not-found.exception'
import { PrismaService } from '../../database/prisma.service'
import type { DemoBootstrapDto, DemoUserDto } from './demo.dto'

/**
 * Demo tenant discovery. Development/demo surface (like the debug graph
 * controller): exposes the seeded demo tenant so the web UI can log in and
 * explore the live engines. Deliberately scoped to the seeded slugs — it is
 * not a general tenant-lookup API.
 */
@Injectable()
export class DemoService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrap(): Promise<DemoBootstrapDto> {
    const organization = await this.prisma.organization.findUnique({
      where: { slug: 'meridian-health' },
    })
    if (organization === null) {
      throw new NotFoundException('Demo organization not seeded — run `npm run db:seed`')
    }

    const workspace = await this.prisma.workspace.findFirst({
      where: { organizationId: organization.id, slug: 'inpatient-assessment' },
    })
    if (workspace === null) {
      throw new NotFoundException('Demo workspace not seeded')
    }

    const users = await this.prisma.user.findMany({
      where: { organizationId: organization.id, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      include: { department: { select: { name: true } } },
    })

    return {
      organizationId: organization.id,
      organizationName: organization.name,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      users: users.map(toDemoUser),
    }
  }
}

function toDemoUser(user: {
  id: string
  email: string
  name: string
  role: DemoUserDto['role']
  department: { name: string } | null
}): DemoUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    departmentName: user.department?.name ?? null,
  }
}
