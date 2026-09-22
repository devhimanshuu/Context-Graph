import { Injectable } from '@nestjs/common'
import { NotFoundException } from '../../common/exceptions/not-found.exception'
import { PrismaService } from '../../database/prisma.service'
import type { DemoBootstrapDto, DemoUserDto } from './demo.dto'
import type { NodeType, ComplianceTag } from '@prisma/client'

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

  /**
   * Load a starter knowledge set into the given workspace so a fresh
   * organization can immediately run the pipeline, retrieval, and AI chat.
   * Idempotent: nodes are keyed by (workspaceId, type, title).
   */
  async loadStarterKnowledge(workspaceId: string): Promise<{ created: number }> {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (workspace === null) {
      throw new NotFoundException('Workspace not found')
    }

    let created = 0
    for (const node of STARTER_NODES) {
      const existing = await this.prisma.knowledgeNode.findFirst({
        where: { workspaceId, type: node.type, title: node.title },
        select: { id: true },
      })
      if (existing !== null) continue
      await this.prisma.knowledgeNode.create({
        data: {
          organizationId: workspace.organizationId,
          workspaceId,
          type: node.type,
          title: node.title,
          content: node.content,
          status: 'ACTIVE',
          complianceTags: {
            create: node.complianceTags.map((tag) => ({ tag })),
          },
        },
      })
      created += 1
    }
    return { created }
  }
}

interface StarterNode {
  type: NodeType
  title: string
  content: string
  complianceTags: ComplianceTag[]
}

const STARTER_NODES: StarterNode[] = [
  {
    type: 'FACT',
    title: 'Inpatient assessment requirement',
    content:
      'All inpatient assessments must be completed within 24 hours of admission and reviewed by the attending clinician before discharge planning begins.',
    complianceTags: ['HIPAA'],
  },
  {
    type: 'CONSTRAINT',
    title: 'Medication reconciliation window',
    content:
      'Medication reconciliation is mandatory at admission, transfer, and discharge. Discrepancies must be resolved within 4 hours or escalated to the pharmacy lead.',
    complianceTags: ['HIPAA', 'PHI'],
  },
  {
    type: 'DECISION',
    title: 'Discharge planning starts at admission',
    content:
      'Discharge planning starts at admission: assess mobility, medication reconciliation, and follow-up appointments. The case manager signs off before the discharge summary is issued.',
    complianceTags: ['HIPAA'],
  },
  {
    type: 'ANTI_PATTERN',
    title: 'Verbal-only discharge instructions',
    content:
      'Issuing discharge instructions verbally without a written summary causes readmission risk and fails audit. Always produce a written, patient-readable summary.',
    complianceTags: [],
  },
]

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
