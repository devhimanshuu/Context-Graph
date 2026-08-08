import { z } from 'zod'
import { ComplianceTag, NodeStatus, NodeType } from '@contextgraph/types'

export const createKnowledgeNodeSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1),
  type: z.nativeEnum(NodeType),
  status: z.nativeEnum(NodeStatus).default(NodeStatus.DRAFT),
  importance: z.number().int().min(0).max(100).default(0),
  derivabilityScore: z.number().int().min(0).max(100).default(0),
  complianceTags: z.array(z.nativeEnum(ComplianceTag)).default([]),
  validFrom: z.iso.datetime().nullable().optional(),
  validTo: z.iso.datetime().nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const updateKnowledgeNodeSchema = createKnowledgeNodeSchema.partial()

export const knowledgeNodeIdSchema = z.string().uuid()

export type CreateKnowledgeNodeInput = z.infer<typeof createKnowledgeNodeSchema>
export type UpdateKnowledgeNodeInput = z.infer<typeof updateKnowledgeNodeSchema>
