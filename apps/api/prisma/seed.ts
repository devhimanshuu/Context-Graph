/* ContextGraph — database seed (Phase 2) Seeds a realistic, domain-agnostic dataset: */
import 'dotenv/config'
import dotenv from 'dotenv'
import {
  PrismaClient,
  type ComplianceTag,
  type NodeStatus,
  type NodeType,
  type RelationshipType,
} from '@prisma/client'

// Next.js convention is `.env.local`; Prisma CLI loads `.env`. Load both so
// the seed works regardless of where DATABASE_URL lives (`.env.local` wins).
dotenv.config({ path: '.env', override: true })

const prisma = new PrismaClient()

const SEEDED_ORG_SLUGS = ['meridian-health', 'helios-capital']

// Fixed clock for deterministic timestamps in seeded validity windows.
const now = new Date()
const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())

// Seed is a standalone dev/admin tool: it intentionally avoids the app's logging module (which is
// wired to Next's server-only env config) and writes to stdout directly.
function log(message: string): void {
  // eslint-disable-next-line no-console -- standalone tooling output
  console.log(`[seed] ${message}`)
}

async function main(): Promise<void> {
  log('Seeding ContextGraph database...')

  // -- Reset: wipe seeded organizations (cascades to all children) ---------
  await prisma.organization.deleteMany({ where: { slug: { in: SEEDED_ORG_SLUGS } } })

  // -------------------------------------------------------------------------
  // 1. Organizations (tenants)
  // -------------------------------------------------------------------------
  const meridian = await prisma.organization.create({
    data: {
      name: 'Meridian Health System',
      slug: 'meridian-health',
      industry: 'HEALTHCARE',
      status: 'ACTIVE',
      configuration: {
        branding: { primaryColor: '#0ea5e9' },
        features: { analytics: true, realtime: false },
      },
    },
  })

  const helios = await prisma.organization.create({
    data: {
      name: 'Helios Capital',
      slug: 'helios-capital',
      industry: 'FINANCE',
      status: 'ACTIVE',
      configuration: { branding: { primaryColor: '#6366f1' } },
    },
  })

  // -------------------------------------------------------------------------
  // 2. Workspaces (knowledge containers)
  // -------------------------------------------------------------------------
  const inpatient = await prisma.workspace.create({
    data: {
      organizationId: meridian.id,
      name: 'Inpatient Assessment',
      slug: 'inpatient-assessment',
      description: 'Clinical assessment knowledge for inpatient care',
    },
  })

  const emergency = await prisma.workspace.create({
    data: {
      organizationId: meridian.id,
      name: 'Emergency Protocols',
      slug: 'emergency-protocols',
      description: 'Triage and emergency response protocols',
    },
  })

  const kyc = await prisma.workspace.create({
    data: {
      organizationId: helios.id,
      name: 'KYC Onboarding',
      slug: 'kyc-onboarding',
      description: 'Know-your-customer verification knowledge',
    },
  })

  // -------------------------------------------------------------------------
  // 3. Departments (org chart with hierarchy)
  // -------------------------------------------------------------------------
  const clinical = await prisma.department.create({
    data: {
      organizationId: meridian.id,
      name: 'Clinical Services',
      code: 'CLINICAL',
      hierarchyLevel: 0,
    },
  })

  const cardiology = await prisma.department.create({
    data: {
      organizationId: meridian.id,
      parentId: clinical.id,
      name: 'Cardiology',
      code: 'CARDIOLOGY',
      hierarchyLevel: 1,
    },
  })

  const oncology = await prisma.department.create({
    data: {
      organizationId: meridian.id,
      parentId: clinical.id,
      name: 'Oncology',
      code: 'ONCOLOGY',
      hierarchyLevel: 1,
    },
  })

  const nursing = await prisma.department.create({
    data: {
      organizationId: meridian.id,
      parentId: clinical.id,
      name: 'Nursing',
      code: 'NURSING',
      hierarchyLevel: 1,
    },
  })

  const quality = await prisma.department.create({
    data: {
      organizationId: meridian.id,
      name: 'Quality & Safety',
      code: 'QUALITY',
      hierarchyLevel: 0,
    },
  })

  const compliance = await prisma.department.create({
    data: {
      organizationId: meridian.id,
      parentId: quality.id,
      name: 'Compliance',
      code: 'COMPLIANCE',
      hierarchyLevel: 1,
    },
  })

  const heliosOps = await prisma.department.create({
    data: {
      organizationId: helios.id,
      name: 'Operations',
      code: 'OPS',
      hierarchyLevel: 0,
    },
  })

  // -------------------------------------------------------------------------
  // 4. Users (every role represented)
  // -------------------------------------------------------------------------
  const users = await Promise.all([
    prisma.user.create({
      data: {
        organizationId: meridian.id,
        departmentId: clinical.id,
        email: 'amelia.chen@meridian.health',
        name: 'Dr. Amelia Chen',
        role: 'ADMIN',
        permissionLevel: 'ADMIN',
        complianceClearance: 'CRITICAL',
        status: 'ACTIVE',
      },
    }),
    prisma.user.create({
      data: {
        organizationId: meridian.id,
        departmentId: cardiology.id,
        email: 'raj.patel@meridian.health',
        name: 'Dr. Raj Patel',
        role: 'HOD',
        permissionLevel: 'WRITE',
        complianceClearance: 'RESTRICTED',
        status: 'ACTIVE',
      },
    }),
    prisma.user.create({
      data: {
        organizationId: meridian.id,
        departmentId: oncology.id,
        email: 'sofia.rossi@meridian.health',
        name: 'Dr. Sofia Rossi',
        role: 'EDITOR',
        permissionLevel: 'WRITE',
        complianceClearance: 'SENSITIVE',
        status: 'ACTIVE',
      },
    }),
    prisma.user.create({
      data: {
        organizationId: meridian.id,
        departmentId: nursing.id,
        email: 'michael.okafor@meridian.health',
        name: 'Michael Okafor, RN',
        role: 'VIEWER',
        permissionLevel: 'READ',
        complianceClearance: 'STANDARD',
        status: 'ACTIVE',
      },
    }),
    prisma.user.create({
      data: {
        organizationId: meridian.id,
        departmentId: quality.id,
        email: 'lena.weber@meridian.health',
        name: 'Dr. Lena Weber',
        role: 'QUALITY',
        permissionLevel: 'WRITE',
        complianceClearance: 'SENSITIVE',
        status: 'ACTIVE',
      },
    }),
    prisma.user.create({
      data: {
        organizationId: meridian.id,
        departmentId: compliance.id,
        email: 'tom.becker@meridian.health',
        name: 'Tom Becker',
        role: 'AUDITOR',
        permissionLevel: 'READ',
        complianceClearance: 'CRITICAL',
        status: 'ACTIVE',
      },
    }),
    prisma.user.create({
      data: {
        organizationId: helios.id,
        departmentId: heliosOps.id,
        email: 'nina.kowalski@helios.capital',
        name: 'Nina Kowalski',
        role: 'ADMIN',
        permissionLevel: 'ADMIN',
        complianceClearance: 'CRITICAL',
        status: 'ACTIVE',
      },
    }),
    prisma.user.create({
      data: {
        organizationId: helios.id,
        departmentId: heliosOps.id,
        email: 'omar.haddad@helios.capital',
        name: 'Omar Haddad',
        role: 'EDITOR',
        permissionLevel: 'WRITE',
        complianceClearance: 'RESTRICTED',
        status: 'ACTIVE',
      },
    }),
  ])

  // Only the users referenced below are destructured; the rest (michael,
  // tom, omar) exist purely to exercise every role in the schema.
  const [amelia, raj, sofia, , lena, , nina] = users

  // Map each tenant to its admin user so content attribution stays inside the
  // tenant. Extend this map when adding organizations — never hardcode a
  // per-tenant ternary, or new tenants would inherit a foreign creator.
  const adminByOrgId = new Map<string, string>([
    [meridian.id, amelia.id],
    [helios.id, nina.id],
  ])

  function creatorFor(organizationId: string): string {
    const adminId = adminByOrgId.get(organizationId)
    if (adminId === undefined) {
      throw new Error(`Seed has no admin user for organization ${organizationId}`)
    }
    return adminId
  }

  // -------------------------------------------------------------------------
  // 5. Knowledge nodes — hospital assessment expressed generically
  // -------------------------------------------------------------------------
  interface SeedNode {
    key: string
    workspaceId: string
    departmentId: string
    title: string
    content: string
    type: NodeType
    status: NodeStatus
    importance: number
    derivabilityScore: number
    validFrom: Date
    validTo: Date
    tags: ComplianceTag[]
  }

  const nodeData: SeedNode[] = [
    {
      key: 'htn-crisis',
      workspaceId: inpatient.id,
      departmentId: cardiology.id,
      title: 'Hypertensive crisis threshold',
      content:
        'Systolic blood pressure >= 180 mmHg or diastolic >= 120 mmHg constitutes a hypertensive crisis requiring immediate evaluation.',
      type: 'FACT' as const,
      status: 'ACTIVE' as const,
      importance: 90,
      derivabilityScore: 100,
      validFrom: yearAgo,
      validTo: nextYear,
      tags: ['HIPAA', 'PHI', 'CONFIDENTIAL'],
    },
    {
      key: 'labetalol-asthma',
      workspaceId: inpatient.id,
      departmentId: cardiology.id,
      title: 'Labetalol contraindicated in asthma',
      content:
        'Intravenous labetalol is contraindicated in patients with reactive airway disease (asthma/COPD).',
      type: 'CONSTRAINT' as const,
      status: 'ACTIVE' as const,
      importance: 85,
      derivabilityScore: 100,
      validFrom: yearAgo,
      validTo: nextYear,
      tags: ['HIPAA', 'PHI'],
    },
    {
      key: 'icu-admission',
      workspaceId: inpatient.id,
      departmentId: cardiology.id,
      title: 'ICU admission for hypertensive emergency',
      content:
        'Admit to ICU when systolic BP >= 180 mmHg is accompanied by evidence of acute end-organ damage.',
      type: 'DECISION' as const,
      status: 'ACTIVE' as const,
      importance: 95,
      derivabilityScore: 40,
      validFrom: yearAgo,
      validTo: nextYear,
      tags: ['HIPAA', 'PHI', 'RESTRICTED'],
    },
    {
      key: 'sofa-sepsis',
      workspaceId: inpatient.id,
      departmentId: clinical.id,
      title: 'Sepsis defined by SOFA score',
      content:
        'An acute increase of 2 or more SOFA points indicates organ dysfunction consistent with sepsis.',
      type: 'FACT' as const,
      status: 'ACTIVE' as const,
      importance: 90,
      derivabilityScore: 100,
      validFrom: yearAgo,
      validTo: nextYear,
      tags: ['HIPAA', 'PHI'],
    },
    {
      key: 'antibiotics-1hr',
      workspaceId: inpatient.id,
      departmentId: clinical.id,
      title: 'Broad-spectrum antibiotics within 1 hour',
      content:
        'For sepsis/septic shock, administer broad-spectrum antibiotics within 1 hour of recognition.',
      type: 'DECISION' as const,
      status: 'ACTIVE' as const,
      importance: 95,
      derivabilityScore: 55,
      validFrom: yearAgo,
      validTo: nextYear,
      tags: ['HIPAA', 'PHI', 'RESTRICTED'],
    },
    {
      key: 'delayed-antibiotics',
      workspaceId: inpatient.id,
      departmentId: clinical.id,
      title: 'Delaying antibiotics pending cultures',
      content:
        'Holding antibiotics until culture results return is an anti-pattern that increases mortality in septic shock.',
      type: 'ANTI_PATTERN' as const,
      status: 'ACTIVE' as const,
      importance: 80,
      derivabilityScore: 30,
      validFrom: yearAgo,
      validTo: nextYear,
      tags: ['INTERNAL'],
    },
    {
      key: 'aspirin-secondary',
      workspaceId: inpatient.id,
      departmentId: cardiology.id,
      title: 'Aspirin for secondary prevention',
      content:
        'Low-dose aspirin (75-100 mg daily) is recommended for secondary prevention after myocardial infarction.',
      type: 'FACT' as const,
      status: 'ACTIVE' as const,
      importance: 75,
      derivabilityScore: 100,
      validFrom: yearAgo,
      validTo: nextYear,
      tags: ['HIPAA', 'INTERNAL'],
    },
    {
      key: 'aspirin-gi-bleeding',
      workspaceId: inpatient.id,
      departmentId: cardiology.id,
      title: 'Aspirin contraindicated in active GI bleeding',
      content:
        'Aspirin is contraindicated during active gastrointestinal bleeding; weigh risk/benefit before resuming.',
      type: 'CONSTRAINT' as const,
      status: 'ACTIVE' as const,
      importance: 80,
      derivabilityScore: 100,
      validFrom: yearAgo,
      validTo: nextYear,
      tags: ['HIPAA', 'PHI'],
    },
    {
      key: 'dapt-12mo',
      workspaceId: inpatient.id,
      departmentId: cardiology.id,
      title: 'DAPT for 12 months after ACS',
      content:
        'Dual antiplatelet therapy (aspirin + P2Y12 inhibitor) for 12 months after acute coronary syndrome.',
      type: 'DECISION' as const,
      status: 'ACTIVE' as const,
      importance: 70,
      derivabilityScore: 60,
      validFrom: new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()),
      validTo: nextYear,
      tags: ['HIPAA', 'INTERNAL'],
    },
    {
      key: 'dapt-9mo',
      workspaceId: inpatient.id,
      departmentId: cardiology.id,
      title: 'Legacy DAPT 9-month protocol',
      content:
        'Previous protocol recommended 9 months of DAPT; superseded by the 12-month guideline.',
      type: 'DECISION' as const,
      status: 'SUPERSEDED' as const,
      importance: 30,
      derivabilityScore: 100,
      validFrom: new Date(now.getFullYear() - 5, now.getMonth(), now.getDate()),
      validTo: new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()),
      tags: ['HIPAA', 'INTERNAL'],
    },
    {
      key: 'glucose-icu',
      workspaceId: inpatient.id,
      departmentId: clinical.id,
      title: 'ICU glucose target 140-180 mg/dL',
      content:
        'Target blood glucose 140-180 mg/dL in critically ill patients; tighter targets increase hypoglycemia risk.',
      type: 'FACT' as const,
      status: 'ACTIVE' as const,
      importance: 60,
      derivabilityScore: 100,
      validFrom: yearAgo,
      validTo: nextYear,
      tags: ['HIPAA', 'INTERNAL'],
    },
    {
      key: 'vte-prophylaxis',
      workspaceId: inpatient.id,
      departmentId: clinical.id,
      title: 'VTE prophylaxis for immobile patients',
      content:
        'Pharmacologic VTE prophylaxis (e.g. low-molecular-weight heparin) is indicated for immobile hospitalized patients.',
      type: 'FACT' as const,
      status: 'ACTIVE' as const,
      importance: 70,
      derivabilityScore: 100,
      validFrom: yearAgo,
      validTo: nextYear,
      tags: ['HIPAA', 'PHI'],
    },
    {
      key: 'heparin-contraindications',
      workspaceId: inpatient.id,
      departmentId: clinical.id,
      title: 'Heparin contraindications',
      content:
        'Heparin is contraindicated in active bleeding, severe thrombocytopenia, or recent major surgery.',
      type: 'CONSTRAINT' as const,
      status: 'ACTIVE' as const,
      importance: 75,
      derivabilityScore: 100,
      validFrom: yearAgo,
      validTo: nextYear,
      tags: ['HIPAA', 'PHI', 'CONFIDENTIAL'],
    },
    {
      key: 'prophylactic-anticoag',
      workspaceId: inpatient.id,
      departmentId: clinical.id,
      title: 'Administer prophylactic anticoagulation',
      content:
        'Initiate prophylactic anticoagulation for immobile patients unless contraindications are present.',
      type: 'DECISION' as const,
      status: 'ACTIVE' as const,
      importance: 72,
      derivabilityScore: 45,
      validFrom: yearAgo,
      validTo: nextYear,
      tags: ['HIPAA', 'PHI', 'CONFIDENTIAL'],
    },
    {
      key: 'stemmi-ecg-10min',
      workspaceId: emergency.id,
      departmentId: cardiology.id,
      title: 'ECG within 10 minutes of arrival',
      content: 'Acquire a 12-lead ECG within 10 minutes of arrival for suspected STEMI.',
      type: 'DECISION' as const,
      status: 'ACTIVE' as const,
      importance: 85,
      derivabilityScore: 50,
      validFrom: yearAgo,
      validTo: nextYear,
      tags: ['HIPAA', 'PHI'],
    },
    // -- Finance: a second industry to prove domain-agnosticism --------------
    {
      key: 'pep-screening',
      workspaceId: kyc.id,
      departmentId: heliosOps.id,
      title: 'PEP screening required',
      content:
        'All new accounts require politically exposed person (PEP) screening before activation.',
      type: 'FACT' as const,
      status: 'ACTIVE' as const,
      importance: 90,
      derivabilityScore: 100,
      validFrom: yearAgo,
      validTo: nextYear,
      tags: ['PCI_DSS', 'CONFIDENTIAL'],
    },
    {
      key: 'sanctions-check',
      workspaceId: kyc.id,
      departmentId: heliosOps.id,
      title: 'Sanctions list check is mandatory',
      content:
        'Accounts must pass sanctions list screening; a hit blocks onboarding pending review.',
      type: 'CONSTRAINT' as const,
      status: 'ACTIVE' as const,
      importance: 95,
      derivabilityScore: 100,
      validFrom: yearAgo,
      validTo: nextYear,
      tags: ['PCI_DSS', 'RESTRICTED'],
    },
    {
      key: 'edd-high-risk',
      workspaceId: kyc.id,
      departmentId: heliosOps.id,
      title: 'Enhanced due diligence for high-risk clients',
      content:
        'Clients flagged as high risk (large cash volume, high-risk jurisdiction) require enhanced due diligence.',
      type: 'DECISION' as const,
      status: 'ACTIVE' as const,
      importance: 88,
      derivabilityScore: 35,
      validFrom: yearAgo,
      validTo: nextYear,
      tags: ['PCI_DSS', 'CONFIDENTIAL'],
    },
  ]

  const nodes: Record<string, string> = {}
  for (const item of nodeData) {
    const {
      key,
      workspaceId,
      departmentId,
      title,
      content,
      type,
      status,
      importance,
      derivabilityScore,
      validFrom,
      validTo,
      tags,
    } = item
    // Attribution stays within the tenant (resolved via adminByOrgId).
    const nodeOrgId = workspaceId === kyc.id ? helios.id : meridian.id
    const creatorId = creatorFor(nodeOrgId)
    const node = await prisma.knowledgeNode.create({
      data: {
        organizationId: nodeOrgId,
        workspaceId,
        departmentId,
        title,
        content,
        type,
        status,
        importance,
        derivabilityScore,
        validFrom,
        validTo,
        createdById: creatorId,
        updatedById: creatorId,
        complianceTags: { create: tags.map((tag) => ({ tag })) },
      },
    })
    nodes[key] = node.id
  }

  // -------------------------------------------------------------------------
  // 6. Graph edges (typed, directed relationships)
  // -------------------------------------------------------------------------
  const edgeData: Array<[string, string, RelationshipType, number?]> = [
    // [source, target, relationshipType, weight]
    ['icu-admission', 'htn-crisis', 'DERIVED_FROM'],
    ['icu-admission', 'labetalol-asthma', 'REQUIRES'], // must check contraindications
    ['antibiotics-1hr', 'sofa-sepsis', 'DERIVED_FROM'],
    ['delayed-antibiotics', 'antibiotics-1hr', 'CONTRADICTS'],
    ['aspirin-gi-bleeding', 'aspirin-secondary', 'CONTRADICTS'],
    ['dapt-12mo', 'dapt-9mo', 'SUPERSEDES'],
    ['prophylactic-anticoag', 'vte-prophylaxis', 'REQUIRES'],
    ['vte-prophylaxis', 'prophylactic-anticoag', 'SUPPORTS'],
    ['heparin-contraindications', 'prophylactic-anticoag', 'CONTRADICTS'],
    ['edd-high-risk', 'pep-screening', 'DERIVED_FROM'],
    ['edd-high-risk', 'sanctions-check', 'REQUIRES'],
  ]

  for (const [sourceKey, targetKey, relationshipType, weight] of edgeData) {
    const sourceNode = nodes[sourceKey]
    const targetNode = nodes[targetKey]
    if (!sourceNode || !targetNode) {
      throw new Error(`Seed edge references unknown node: ${sourceKey} → ${targetKey}`)
    }
    // Both endpoints share the same organization; resolve it from the source.
    const source = await prisma.knowledgeNode.findUniqueOrThrow({ where: { id: sourceNode } })
    await prisma.graphEdge.create({
      data: {
        organizationId: source.organizationId,
        workspaceId: source.workspaceId,
        sourceId: sourceNode,
        targetId: targetNode,
        relationshipType,
        weight: weight ?? 1,
        // Edge attribution follows the source node's tenant.
        createdById: creatorFor(source.organizationId),
      },
    })
  }

  // -------------------------------------------------------------------------
  // 7. Permission profiles + assignments
  // -------------------------------------------------------------------------
  const clinicalEditors = await prisma.permissionProfile.create({
    data: {
      organizationId: meridian.id,
      workspaceId: inpatient.id,
      name: 'Clinical Editors',
      description: 'Read/write access to inpatient clinical knowledge',
      isDefault: false,
      rules: [
        { role: 'EDITOR', resource: 'knowledgeNode', actions: ['read', 'write'] },
        { role: 'HOD', resource: 'knowledgeNode', actions: ['read', 'write', 'publish'] },
        { role: 'VIEWER', resource: 'knowledgeNode', actions: ['read'] },
      ],
    },
  })

  await prisma.permissionProfile.create({
    data: {
      organizationId: meridian.id,
      name: 'Organization Auditors',
      description: 'Read-only access to audit logs and system events',
      isDefault: false,
      rules: [{ role: 'AUDITOR', resource: 'auditLog', actions: ['read'] }],
    },
  })

  await prisma.permissionProfile.create({
    data: {
      organizationId: meridian.id,
      name: 'Default Members',
      description: 'Fallback grants applied to every organization member',
      isDefault: true,
      rules: [
        { role: '*', resource: 'knowledgeNode', actions: ['read'], where: { status: 'ACTIVE' } },
      ],
    },
  })

  await prisma.permissionProfileAssignment.create({
    data: { profileId: clinicalEditors.id, userId: sofia.id, grantedById: amelia.id },
  })

  await prisma.permissionProfileAssignment.create({
    data: { profileId: clinicalEditors.id, userId: raj.id, grantedById: amelia.id },
  })

  await prisma.permissionProfile.create({
    data: {
      organizationId: helios.id,
      name: 'Compliance Team',
      description: 'Full access to KYC compliance knowledge',
      isDefault: false,
      rules: [{ role: '*', resource: 'knowledgeNode', actions: ['read', 'write'] }],
    },
  })

  // -------------------------------------------------------------------------
  // 8. Context rules (deterministic rule engine input)
  // -------------------------------------------------------------------------
  const sepsisRule = await prisma.contextRule.create({
    data: {
      organizationId: meridian.id,
      workspaceId: inpatient.id,
      name: 'Sepsis alert escalation',
      description:
        'Raise a high-priority sepsis alert when SOFA increases by 2+ with elevated lactate.',
      condition: {
        and: [
          { field: 'vitals.sofaScore', op: 'gte', value: 2 },
          { field: 'labs.lactate', op: 'gt', value: 2 },
        ],
      },
      action: { emit: 'sepsis-alert', severity: 'high', workflow: 'rapid-response' },
      priority: 10,
      status: 'ACTIVE',
      isEnabled: true,
      createdById: lena.id,
    },
  })

  await prisma.contextRule.create({
    data: {
      organizationId: meridian.id,
      workspaceId: inpatient.id,
      name: 'Hypertensive crisis workflow',
      description: 'Trigger ICU review workflow when systolic BP reaches crisis threshold.',
      condition: { field: 'vitals.systolicBp', op: 'gte', value: 180 },
      action: { emit: 'hypertensive-crisis', severity: 'high', workflow: 'icu-review' },
      priority: 20,
      status: 'ACTIVE',
      isEnabled: true,
      createdById: raj.id,
    },
  })

  await prisma.contextRule.create({
    data: {
      organizationId: meridian.id,
      workspaceId: inpatient.id,
      name: 'Documentation audit sample',
      description: 'Draft rule: flag nodes missing a review date for QA sampling.',
      condition: { field: 'node.reviewedAt', op: 'isNull', value: true },
      action: { emit: 'qa-sample-candidate' },
      priority: 5,
      status: 'DRAFT',
      isEnabled: false,
      createdById: lena.id,
    },
  })

  // -------------------------------------------------------------------------
  // 9. Audit log (append-only event trail)
  // -------------------------------------------------------------------------
  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: meridian.id,
        actorId: amelia.id,
        action: 'organization.created',
        entityType: 'organization',
        entityId: meridian.id,
        after: { slug: meridian.slug },
      },
      {
        organizationId: meridian.id,
        actorId: amelia.id,
        workspaceId: inpatient.id,
        action: 'workspace.created',
        entityType: 'workspace',
        entityId: inpatient.id,
        after: { slug: inpatient.slug },
      },
      {
        organizationId: meridian.id,
        actorId: amelia.id,
        workspaceId: inpatient.id,
        action: 'knowledgeNode.created',
        entityType: 'knowledgeNode',
        entityId: nodes['icu-admission']!,
        after: { title: 'ICU admission for hypertensive emergency' },
      },
      {
        organizationId: meridian.id,
        actorId: lena.id,
        workspaceId: inpatient.id,
        action: 'contextRule.created',
        entityType: 'contextRule',
        entityId: sepsisRule.id,
        after: { name: sepsisRule.name },
      },
    ],
  })

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  const counts = {
    organizations: await prisma.organization.count(),
    workspaces: await prisma.workspace.count(),
    departments: await prisma.department.count(),
    users: await prisma.user.count(),
    knowledgeNodes: await prisma.knowledgeNode.count(),
    graphEdges: await prisma.graphEdge.count(),
    permissionProfiles: await prisma.permissionProfile.count(),
    contextRules: await prisma.contextRule.count(),
    auditLogs: await prisma.auditLog.count(),
  }

  log(`Seed complete: ${JSON.stringify(counts)}`)
}

main()
  .catch((error) => {
    // console.error is whitelisted by the ESLint no-console rule.
    console.error('[seed] Failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
