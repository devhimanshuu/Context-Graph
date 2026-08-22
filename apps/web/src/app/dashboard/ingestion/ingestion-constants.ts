import type { DocumentStatus } from '@/lib/api/types'

export interface UploadFormState {
  file: File | null
  filename: string
  workspaceId: string
  departmentId: string
  tags: string[]
  visibility: 'PRIVATE' | 'ORGANIZATION' | 'PUBLIC'
}

export const STATUS_TONE: Record<DocumentStatus, string> = {
  UPLOADED: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  VALIDATING: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  QUEUED: 'border-zinc-500/40 text-zinc-500 dark:text-zinc-400',
  EXTRACTING: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  EXTRACTED: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  NORMALIZING: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  NORMALIZED: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  CHUNKING: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  CHUNKED: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  INDEXING: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  INDEXED: 'border-sky-500/40 text-sky-600 dark:text-sky-400',
  PROCESSING: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  READY: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  FAILED: 'border-rose-500/40 text-rose-600 dark:text-rose-400',
  ARCHIVED: 'border-zinc-500/40 text-zinc-500 dark:text-zinc-400',
  STALE: 'border-orange-500/40 text-orange-600 dark:text-orange-400',
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function getStageStatus(
  stage: string,
  currentStatus: DocumentStatus,
): 'completed' | 'failed' | 'pending' {
  const stageOrder = [
    'UPLOADED',
    'VALIDATING',
    'QUEUED',
    'EXTRACTING',
    'EXTRACTED',
    'NORMALIZING',
    'NORMALIZED',
    'CHUNKING',
    'CHUNKED',
    'INDEXING',
    'INDEXED',
    'PROCESSING',
    'READY',
  ]

  const currentIdx = stageOrder.indexOf(currentStatus)
  const stageIdx = stageOrder.indexOf(stage)

  if (currentStatus === 'FAILED') {
    return stageIdx <= currentIdx ? 'completed' : 'failed'
  }

  return stageIdx < currentIdx ? 'completed' : 'pending'
}
