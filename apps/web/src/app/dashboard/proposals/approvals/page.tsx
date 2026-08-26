'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Shield,
  FileText,
  User,
  MessageSquare,
} from 'lucide-react'

interface ApprovalRequest {
  id: string
  proposalId: string
  requestedAction: string
  nodeType: string
  title: string
  content: string
  classification: string
  proposedById: string | null
  agentIdentityId: string | null
  status: string
  resolvedById: string | null
  resolutionNote: string | null
  publishedNodeId: string | null
  createdAt: string
  resolvedAt: string | null
}

interface ApprovalOverview {
  pending: number
  approved: number
  rejected: number
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
  EXPIRED: 'bg-gray-100 text-gray-700 border-gray-200',
  CANCELLED: 'bg-gray-100 text-gray-700 border-gray-200',
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  PUBLIC: 'bg-emerald-50 text-emerald-600',
  INTERNAL: 'bg-blue-50 text-blue-600',
  CONFIDENTIAL: 'bg-orange-50 text-orange-600',
  RESTRICTED: 'bg-red-50 text-red-600',
}

export default function ApprovalsPage() {
  const [overview, setOverview] = useState<ApprovalOverview | null>(null)
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolveNote, setResolveNote] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)

      const [overviewRes, approvalsRes] = await Promise.allSettled([
        fetch('/api/v1/proposals/approvals/overview').then((r) => r.json()),
        fetch(`/api/v1/proposals/approvals?${params.toString()}`).then((r) => r.json()),
      ])

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value)
      if (approvalsRes.status === 'fulfilled')
        setApprovals(Array.isArray(approvalsRes.value) ? approvalsRes.value : [])
    } catch {
      // Silently handle
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const resolveApproval = async (approvalId: string, resolution: 'APPROVED' | 'REJECTED') => {
    setResolvingId(approvalId)
    try {
      await fetch(`/api/v1/proposals/approvals/${approvalId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, note: resolveNote || undefined }),
      })
      setResolveNote('')
      setExpandedId(null)
      void fetchData()
    } catch {
      // Handle error
    } finally {
      setResolvingId(null)
    }
  }

  const pending = overview?.pending ?? 0
  const approved = overview?.approved ?? 0
  const rejected = overview?.rejected ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Approval Requests</h1>
          <p className="text-muted-foreground mt-1">
            Review and resolve agent-submitted knowledge proposals that require human approval
          </p>
        </div>
        <Button variant="outline" onClick={() => void fetchData()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pending}</div>
            <p className="text-muted-foreground text-xs">Awaiting your review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{approved}</div>
            <p className="text-muted-foreground text-xs">Published to knowledge graph</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejected}</div>
            <p className="text-muted-foreground text-xs">Not published</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filter by status:</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-background rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Approval Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Approval Queue
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Proposals requiring human review before they become organizational knowledge
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground flex h-32 items-center justify-center">
              Loading approvals...
            </div>
          ) : approvals.length === 0 ? (
            <div className="text-muted-foreground flex h-32 items-center justify-center">
              No approval requests found
            </div>
          ) : (
            <div className="space-y-3">
              {approvals.map((approval) => (
                <div key={approval.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {approval.nodeType === 'DECISION' ? (
                        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
                      ) : (
                        <FileText className="mt-0.5 h-5 w-5 text-blue-500" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{approval.title}</span>
                          <Badge variant="outline" className={STATUS_COLORS[approval.status] ?? ''}>
                            {approval.status}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={CLASSIFICATION_COLORS[approval.classification] ?? ''}
                          >
                            {approval.classification}
                          </Badge>
                          <Badge variant="outline">{approval.nodeType}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                          {approval.content}
                        </p>
                        <div className="text-muted-foreground mt-2 flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {approval.proposedById
                              ? `User ${approval.proposedById.slice(0, 8)}`
                              : 'Agent'}
                          </span>
                          <span>{new Date(approval.createdAt).toLocaleString()}</span>
                          {approval.resolvedAt && (
                            <span className="text-emerald-600">
                              Resolved {new Date(approval.resolvedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {approval.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setExpandedId(expandedId === approval.id ? null : approval.id)
                          }
                        >
                          Review
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Expanded review panel */}
                  {expandedId === approval.id && approval.status === 'PENDING' && (
                    <div className="bg-muted/30 mt-4 rounded-lg border p-4">
                      <div className="mb-3">
                        <h4 className="text-sm font-medium">Full Content</h4>
                        <p className="mt-1 text-sm whitespace-pre-wrap">{approval.content}</p>
                      </div>
                      <div className="mb-3">
                        <label className="mb-1 block text-sm font-medium">
                          Resolution Note (optional)
                        </label>
                        <textarea
                          value={resolveNote}
                          onChange={(e) => setResolveNote(e.target.value)}
                          placeholder="Add a note about your decision..."
                          className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => void resolveApproval(approval.id, 'APPROVED')}
                          disabled={resolvingId === approval.id}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          {resolvingId === approval.id ? 'Approving...' : 'Approve & Publish'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void resolveApproval(approval.id, 'REJECTED')}
                          disabled={resolvingId === approval.id}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          {resolvingId === approval.id ? 'Rejecting...' : 'Reject'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setExpandedId(null)
                            setResolveNote('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Resolution display */}
                  {approval.status !== 'PENDING' && approval.resolutionNote && (
                    <div className="bg-muted/20 mt-3 rounded-lg border p-3">
                      <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <MessageSquare className="h-3 w-3" />
                        Resolution note:
                      </div>
                      <p className="mt-1 text-sm">{approval.resolutionNote}</p>
                    </div>
                  )}

                  {approval.publishedNodeId && (
                    <div className="mt-2">
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-emerald-700"
                      >
                        Published as node {approval.publishedNodeId.slice(0, 8)}…
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
