'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  GitBranch,
  Layers,
} from 'lucide-react'

interface ProposalOverview {
  total: number
  proposed: number
  pendingApproval: number
  published: number
  rejected: number
}

interface Proposal {
  id: string
  nodeType: string
  title: string
  content: string
  classification: string
  status: string
  decision: string | null
  decisionReason: string | null
  publishedNodeId: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_COLORS: Record<string, string> = {
  PROPOSED: 'bg-blue-100 text-blue-700 border-blue-200',
  VALIDATING: 'bg-amber-100 text-amber-700 border-amber-200',
  PENDING_APPROVAL: 'bg-orange-100 text-orange-700 border-orange-200',
  PUBLISHED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200',
  ARCHIVED: 'bg-gray-100 text-gray-700 border-gray-200',
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  PUBLIC: 'bg-emerald-50 text-emerald-600',
  INTERNAL: 'bg-blue-50 text-blue-600',
  CONFIDENTIAL: 'bg-orange-50 text-orange-600',
  RESTRICTED: 'bg-red-50 text-red-600',
}

export default function ProposalsPage() {
  const router = useRouter()
  const [overview, setOverview] = useState<ProposalOverview | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterNodeType, setFilterNodeType] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterNodeType) params.set('nodeType', filterNodeType)
      params.set('limit', '50')

      const [overviewRes, proposalsRes] = await Promise.allSettled([
        fetch('/api/v1/knowledge/proposals/overview').then((r) => r.json()),
        fetch(`/api/v1/knowledge/proposals?${params.toString()}`).then((r) => r.json()),
      ])

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value)
      if (proposalsRes.status === 'fulfilled')
        setProposals(Array.isArray(proposalsRes.value) ? proposalsRes.value : [])
    } catch {
      // Silently handle — dashboard still renders with defaults.
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterNodeType])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const total = overview?.total ?? 0
  const published = overview?.published ?? 0
  const pendingApproval = overview?.pendingApproval ?? 0
  const rejected = overview?.rejected ?? 0
  const proposed = overview?.proposed ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Proposals</h1>
          <p className="text-muted-foreground mt-1">
            Governed agent write-back — proposals validated against permissions, policies, and graph
            integrity before becoming organizational knowledge
          </p>
        </div>
        <Button variant="outline" onClick={() => void fetchData()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-muted-foreground text-xs">All agent-submitted proposals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{published}</div>
            <p className="text-muted-foreground text-xs">Active knowledge nodes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingApproval}</div>
            <p className="text-muted-foreground text-xs">Awaiting human review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proposed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{proposed}</div>
            <p className="text-muted-foreground text-xs">Awaiting validation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejected}</div>
            <p className="text-muted-foreground text-xs">Failed validation</p>
          </CardContent>
        </Card>
      </div>

      {/* Proposal Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Proposal Lifecycle</CardTitle>
          <p className="text-muted-foreground text-sm">
            Every proposal goes through identity, capability, policy, graph, and audit validation
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { name: 'Proposed', icon: '📝' },
              { name: 'Validating', icon: '🔍' },
              { name: 'Auto-Approve or Approval', icon: '⚖️' },
              { name: 'Persisting', icon: '💾' },
              { name: 'Published', icon: '✅' },
            ].map((step, i, arr) => (
              <div key={step.name} className="flex items-center gap-2">
                <div className="bg-muted/50 flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs">
                  <span>{step.icon}</span>
                  <span className="font-medium">{step.name}</span>
                </div>
                {i < arr.length - 1 && <ArrowRight className="text-muted-foreground h-3 w-3" />}
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-4 text-xs">
            DECISION type proposals and CONFIDENTIAL+ classifications always require human approval.
            Admins can auto-approve FACT proposals.
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Proposals
          </CardTitle>
          <div className="flex items-center gap-4 pt-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-background rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">All statuses</option>
                <option value="PROPOSED">Proposed</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="PUBLISHED">Published</option>
                <option value="REJECTED">Rejected</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Node Type</label>
              <select
                value={filterNodeType}
                onChange={(e) => setFilterNodeType(e.target.value)}
                className="bg-background rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">All types</option>
                <option value="FACT">Fact</option>
                <option value="DECISION">Decision</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground flex h-32 items-center justify-center">
              Loading proposals...
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-muted-foreground flex h-32 items-center justify-center">
              No proposals found — agents can propose knowledge via the MCP propose_node tool
            </div>
          ) : (
            <div className="space-y-2">
              {proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {proposal.nodeType === 'DECISION' ? (
                      <ShieldCheck className="h-5 w-5 text-amber-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-blue-500" />
                    )}
                    <div>
                      <div className="font-medium">{proposal.title}</div>
                      <div className="text-muted-foreground text-xs">
                        {proposal.nodeType} · {proposal.classification} ·{' '}
                        {new Date(proposal.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={STATUS_COLORS[proposal.status] ?? ''}>
                      {proposal.status.replace('_', ' ')}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={CLASSIFICATION_COLORS[proposal.classification] ?? ''}
                    >
                      {proposal.classification}
                    </Badge>
                    {proposal.publishedNodeId && (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-emerald-700"
                      >
                        Published
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card
          className="hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => router.push(ROUTES.knowledge)}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="text-primary h-8 w-8" />
            <div>
              <div className="font-medium">Knowledge</div>
              <div className="text-muted-foreground text-sm">View published knowledge nodes</div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => router.push(ROUTES.knowledgeGraph)}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <GitBranch className="text-primary h-8 w-8" />
            <div>
              <div className="font-medium">Knowledge Graph</div>
              <div className="text-muted-foreground text-sm">View relationships in the graph</div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => router.push(ROUTES.proposalApprovals)}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <ShieldCheck className="text-primary h-8 w-8" />
            <div>
              <div className="font-medium">Approvals</div>
              <div className="text-muted-foreground text-sm">Review pending proposal approvals</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
