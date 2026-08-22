'use client'

import * as React from 'react'
import { CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { COMPLIANCE_TAG_DESCRIPTIONS } from '@/constants/domain'
import { cn } from '@/lib/utils'
import type {
  ComplianceTag,
  Department,
  KnowledgeNode,
  NodeStatus,
  NodeType,
} from '@/lib/api/types'

// ---------------------------------------------------------------------------
// Constants (moved from page)
// ---------------------------------------------------------------------------
export const NODE_TYPES: readonly NodeType[] = ['FACT', 'CONSTRAINT', 'DECISION', 'ANTI_PATTERN']
export const NODE_STATUSES: readonly NodeStatus[] = [
  'DRAFT',
  'ACTIVE',
  'SUPERSEDED',
  'EXPIRED',
  'LEGAL_HOLD',
  'REVIEW_REQUIRED',
  'ARCHIVED',
]
export const COMPLIANCE_TAGS: readonly ComplianceTag[] = [
  'HIPAA',
  'GDPR',
  'PCI_DSS',
  'SOC2',
  'SOX',
  'FINRA',
  'ISO_27001',
  'PHI',
  'PII',
  'CONFIDENTIAL',
  'RESTRICTED',
  'INTERNAL',
  'PUBLIC',
]

// ---------------------------------------------------------------------------
// Form state type
// ---------------------------------------------------------------------------
export interface NodeFormState {
  title: string
  content: string
  type: NodeType
  status: NodeStatus
  importance: number
  derivabilityScore: number
  complianceTags: ComplianceTag[]
  departmentId: string
  validFrom: string
  validTo: string
}

export const EMPTY_FORM: NodeFormState = {
  title: '',
  content: '',
  type: 'FACT',
  status: 'DRAFT',
  importance: 50,
  derivabilityScore: 30,
  complianceTags: [],
  departmentId: '',
  validFrom: '',
  validTo: '',
}

// ---------------------------------------------------------------------------
// FilterSelect — accessible select with visible label
// ---------------------------------------------------------------------------
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  labelById,
  label,
}: {
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  placeholder: string
  ariaLabel: string
  labelById?: Map<string, string>
  label?: string
}) {
  return (
    <div className="space-y-1">
      {label !== undefined && (
        <label className="text-muted-foreground text-[10px] font-medium">{label}</label>
      )}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border px-2 text-sm outline-none focus-visible:ring-3"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labelById?.get(option) ?? option}
          </option>
        ))}
      </select>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ImportanceCell — color-coded importance value
// ---------------------------------------------------------------------------
export function ImportanceCell({ value }: { value: number }) {
  const tone =
    value >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : value >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-muted-foreground'
  return (
    <span
      className={cn('font-mono text-xs font-medium tabular-nums', tone)}
      title={`Importance ${value}/100`}
    >
      {value}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Field — labeled form field wrapper
// ---------------------------------------------------------------------------
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-muted-foreground block text-xs font-medium">{label}</span>
      {children}
    </label>
  )
}

// ---------------------------------------------------------------------------
// NodeEditorDialog — full knowledge node editor
// ---------------------------------------------------------------------------
export function NodeEditorDialog({
  open,
  onOpenChange,
  editingNode,
  form,
  setForm,
  saving,
  error,
  departmentList,
  onToggleTag,
  onSave,
  formErrors,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingNode: KnowledgeNode | null
  form: NodeFormState
  setForm: React.Dispatch<React.SetStateAction<NodeFormState>>
  saving: boolean
  error: string | null
  departmentList: Department[]
  onToggleTag: (tag: ComplianceTag) => void
  onSave: () => void
  formErrors?: { title?: string; content?: string }
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editingNode === null ? 'Add knowledge node' : 'Edit node'}</DialogTitle>
          <DialogDescription>
            Server-side validation and authorization remain authoritative — this form only improves
            the editing experience.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Title">
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="e.g. TKR requires 6 weeks of conservative therapy"
              aria-invalid={formErrors?.title !== undefined}
              className={cn(
                'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3',
                formErrors?.title !== undefined && 'border-destructive',
              )}
            />
            {formErrors?.title !== undefined && (
              <p className="text-destructive text-xs">{formErrors.title}</p>
            )}
          </Field>
          <Field label="Content">
            <textarea
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              rows={4}
              placeholder="The knowledge the node carries — kept verbatim for context assembly."
              aria-invalid={formErrors?.content !== undefined}
              className={cn(
                'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-lg border px-2.5 py-2 text-sm outline-none focus-visible:ring-3',
                formErrors?.content !== undefined && 'border-destructive',
              )}
            />
            {formErrors?.content !== undefined && (
              <p className="text-destructive text-xs">{formErrors.content}</p>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as NodeType })}
                aria-label="Node type"
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
              >
                {NODE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as NodeStatus })}
                aria-label="Node status"
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
              >
                {NODE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`Importance — ${form.importance}`}>
              <input
                type="range"
                min={0}
                max={100}
                value={form.importance}
                onChange={(event) => setForm({ ...form, importance: Number(event.target.value) })}
                className="w-full accent-indigo-500"
              />
            </Field>
            <Field label={`Derivability — ${form.derivabilityScore}`}>
              <input
                type="range"
                min={0}
                max={100}
                value={form.derivabilityScore}
                onChange={(event) =>
                  setForm({ ...form, derivabilityScore: Number(event.target.value) })
                }
                className="w-full accent-sky-500"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Department">
              <select
                value={form.departmentId}
                onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
                aria-label="Department"
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
              >
                <option value="">None</option>
                {departmentList.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Validity window (optional)">
              <div className="flex items-center gap-1.5">
                <input
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(event) => setForm({ ...form, validFrom: event.target.value })}
                  aria-label="Valid from"
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2 text-xs outline-none focus-visible:ring-3"
                />
                <span className="text-muted-foreground">→</span>
                <input
                  type="datetime-local"
                  value={form.validTo}
                  onChange={(event) => setForm({ ...form, validTo: event.target.value })}
                  aria-label="Valid until"
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2 text-xs outline-none focus-visible:ring-3"
                />
              </div>
            </Field>
          </div>

          <Field label={`Compliance tags (${form.complianceTags.length})`}>
            <div className="flex flex-wrap gap-1.5">
              {COMPLIANCE_TAGS.map((tag) => {
                const active = form.complianceTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onToggleTag(tag)}
                    aria-pressed={active}
                    title={COMPLIANCE_TAG_DESCRIPTIONS[tag]}
                    className={cn(
                      'flex flex-col items-start gap-0.5 rounded-md border px-2 py-1 text-left transition-colors',
                      active
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <span
                      className={cn(
                        'font-mono text-[10px] font-medium',
                        active
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {tag}
                    </span>
                    <span
                      className={cn(
                        'max-w-28 text-[9px] leading-tight',
                        active
                          ? 'text-indigo-500/70 dark:text-indigo-400/70'
                          : 'text-muted-foreground/60',
                      )}
                    >
                      {COMPLIANCE_TAG_DESCRIPTIONS[tag]}
                    </span>
                  </button>
                )
              })}
            </div>
          </Field>

          {editingNode !== null && (
            <p className="text-muted-foreground text-[11px]">
              v{editingNode.version} · updated {new Date(editingNode.updatedAt).toLocaleString()}
            </p>
          )}
          {error !== null && (
            <p className="text-destructive flex items-center gap-1.5 text-xs">
              <CircleAlert className="size-3.5" />
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || form.title.trim() === ''}>
            {saving ? <span className="animate-spin">↻</span> : null}
            {editingNode === null ? 'Create node' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
