'use client'

import * as React from 'react'
import {
  Search,
  LoaderCircle,
  CircleAlert,
  Zap,
  GitBranch,
  Sparkles,
  BookOpen,
  History,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { useApi } from '@/components/dashboard/api-provider'
import { useKnowledgeNodes } from '@/hooks/use-api-query'
import type { RetrievalResult, RetrievalCandidate } from '@/lib/api/types'

// ---------------------------------------------------------------------------
// Search history types & localStorage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'contextgraph.retrieval.history'
const MAX_HISTORY = 20

interface SearchHistoryEntry {
  id: string
  query: string
  mode: string
  topK: number
  enableGraph: boolean
  enableSemantic: boolean
  enableLexical: boolean
  resultCount: number
  totalTimeMs: number
  searchedAt: string
}

function loadHistory(): SearchHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return []
    return JSON.parse(raw) as SearchHistoryEntry[]
  } catch {
    return []
  }
}

function saveHistory(entries: SearchHistoryEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Storage full or blocked — fail silently
  }
}

function addToHistory(entry: Omit<SearchHistoryEntry, 'id' | 'searchedAt'>): SearchHistoryEntry[] {
  const current = loadHistory()
  const newEntry: SearchHistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    searchedAt: new Date().toISOString(),
  }
  // Deduplicate by query + mode + settings — replace if same search
  const filtered = current.filter(
    (e) =>
      !(
        e.query === newEntry.query &&
        e.mode === newEntry.mode &&
        e.topK === newEntry.topK &&
        e.enableGraph === newEntry.enableGraph &&
        e.enableSemantic === newEntry.enableSemantic &&
        e.enableLexical === newEntry.enableLexical
      ),
  )
  const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY)
  saveHistory(updated)
  return updated
}

function removeFromHistory(id: string): SearchHistoryEntry[] {
  const current = loadHistory().filter((e) => e.id !== id)
  saveHistory(current)
  return current
}

function clearHistory(): void {
  saveHistory([])
}

// ---------------------------------------------------------------------------
// Source badge — color-coded by retrieval source
// ---------------------------------------------------------------------------
function SourceBadge({ source }: { source: string }) {
  const styles: Record<string, string> = {
    graph: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400',
    semantic: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400',
    lexical: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  }
  return (
    <Badge variant="outline" className={`text-[9px] font-medium ${styles[source] ?? ''}`}>
      {source}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Candidate card
// ---------------------------------------------------------------------------
function CandidateCard({ candidate }: { candidate: RetrievalCandidate }) {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <Card
      className="hover:border-border/80 cursor-pointer transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono text-xs">#{candidate.rank}</span>
              <p className="truncate text-sm font-medium">{candidate.title}</p>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <SourceBadge source={candidate.source} />
              <span className="text-muted-foreground font-mono text-[10px]">
                {(candidate.score * 100).toFixed(1)}%
              </span>
              {candidate.graphScore !== undefined && (
                <span className="text-muted-foreground text-[10px]" title="Graph score">
                  G:{(candidate.graphScore * 100).toFixed(0)}
                </span>
              )}
              {candidate.semanticScore !== undefined && (
                <span className="text-muted-foreground text-[10px]" title="Semantic score">
                  S:{(candidate.semanticScore * 100).toFixed(0)}
                </span>
              )}
              {candidate.lexicalScore !== undefined && (
                <span className="text-muted-foreground text-[10px]" title="Lexical score">
                  L:{(candidate.lexicalScore * 100).toFixed(0)}
                </span>
              )}
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 border-t pt-3">
            <p className="text-muted-foreground text-xs leading-relaxed">
              {candidate.content.length > 500
                ? candidate.content.slice(0, 500) + '…'
                : candidate.content}
            </p>
            {Object.keys(candidate.metadata).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {Object.entries(candidate.metadata).map(([key, value]) => (
                  <Badge key={key} variant="outline" className="text-[9px]">
                    {key}: {String(value)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Search history panel
// ---------------------------------------------------------------------------
function SearchHistoryPanel({
  history,
  onRerun,
  onRemove,
  onClear,
}: {
  history: SearchHistoryEntry[]
  onRerun: (entry: SearchHistoryEntry) => void
  onRemove: (id: string) => void
  onClear: () => void
}) {
  if (history.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <History className="text-muted-foreground size-4" />
            Recent searches
            <Badge variant="secondary" className="font-mono text-[10px]">
              {history.length}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <Trash2 className="size-3.5" />
            Clear
          </Button>
        </div>
        <CardDescription>
          Search history is stored in your browser. Click to re-run with the same settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {history.slice(0, 10).map((entry) => {
            const sources = [
              entry.enableGraph && 'G',
              entry.enableSemantic && 'S',
              entry.enableLexical && 'L',
            ]
              .filter(Boolean)
              .join('+')

            return (
              <div
                key={entry.id}
                className="group hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onRerun(entry)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <Search className="text-muted-foreground size-3 shrink-0" />
                  <span className="truncate font-medium">{entry.query}</span>
                  <Badge variant="outline" className="shrink-0 text-[9px]">
                    {entry.mode}
                  </Badge>
                  <Badge variant="outline" className="shrink-0 text-[9px]">
                    {sources}
                  </Badge>
                  <Badge variant="outline" className="shrink-0 text-[9px]">
                    {entry.resultCount} results
                  </Badge>
                  <span className="text-muted-foreground ml-auto shrink-0 text-[10px]">
                    {formatRelativeTime(entry.searchedAt)}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(entry.id)
                  }}
                  aria-label={`Remove search: ${entry.query}`}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Format relative time (e.g., "2m ago", "1h ago")
// ---------------------------------------------------------------------------
function formatRelativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function RetrievalPage() {
  const { client, bootstrap, status } = useApi()
  const workspaceId = bootstrap?.workspaceId ?? null
  const nodes = useKnowledgeNodes(workspaceId)
  const _nodeList = React.useMemo(() => nodes.data ?? [], [nodes.data])

  const [query, setQuery] = React.useState('')
  const [mode, setMode] = React.useState<string>('HYBRID')
  const [topK, setTopK] = React.useState(20)
  const [enableGraph, setEnableGraph] = React.useState(true)
  const [enableSemantic, setEnableSemantic] = React.useState(true)
  const [enableLexical, setEnableLexical] = React.useState(true)
  const [result, setResult] = React.useState<RetrievalResult | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Search history
  const [history, setHistory] = React.useState<SearchHistoryEntry[]>([])
  const [historyLoaded, setHistoryLoaded] = React.useState(false)

  // Load history on mount
  React.useEffect(() => {
    setHistory(loadHistory())
    setHistoryLoaded(true)
  }, [])

  const search = React.useCallback(async () => {
    if (client === null || query.trim() === '' || workspaceId === null) return
    setLoading(true)
    setError(null)
    try {
      const response = await client.retrievalSearch({
        userQuery: query.trim(),
        workspaceId,
        mode,
        topK,
        enableGraph,
        enableSemantic,
        enableLexical,
      })
      setResult(response)

      // Save to history
      const updated = addToHistory({
        query: query.trim(),
        mode,
        topK,
        enableGraph,
        enableSemantic,
        enableLexical,
        resultCount: response.candidates.length,
        totalTimeMs: response.metrics.totalTimeMs,
      })
      setHistory(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [client, query, workspaceId, mode, topK, enableGraph, enableSemantic, enableLexical])

  // Re-run a search from history
  const rerunSearch = React.useCallback(
    (entry: SearchHistoryEntry) => {
      setQuery(entry.query)
      setMode(entry.mode)
      setTopK(entry.topK)
      setEnableGraph(entry.enableGraph)
      setEnableSemantic(entry.enableSemantic)
      setEnableLexical(entry.enableLexical)
      // Trigger search after state updates via a microtask
      setTimeout(() => {
        // The search callback will use the updated values
        void (async () => {
          if (client === null || workspaceId === null) return
          setLoading(true)
          setError(null)
          try {
            const response = await client.retrievalSearch({
              userQuery: entry.query,
              workspaceId,
              mode: entry.mode,
              topK: entry.topK,
              enableGraph: entry.enableGraph,
              enableSemantic: entry.enableSemantic,
              enableLexical: entry.enableLexical,
            })
            setResult(response)

            const updated = addToHistory({
              query: entry.query,
              mode: entry.mode,
              topK: entry.topK,
              enableGraph: entry.enableGraph,
              enableSemantic: entry.enableSemantic,
              enableLexical: entry.enableLexical,
              resultCount: response.candidates.length,
              totalTimeMs: response.metrics.totalTimeMs,
            })
            setHistory(updated)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed')
            setResult(null)
          } finally {
            setLoading(false)
          }
        })()
      }, 0)
    },
    [client, workspaceId],
  )

  // Remove a single history entry
  const removeHistoryEntry = React.useCallback((id: string) => {
    const updated = removeFromHistory(id)
    setHistory(updated)
  }, [])

  // Clear all history
  const clearAllHistory = React.useCallback(() => {
    clearHistory()
    setHistory([])
  }, [])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void search()
      }
    },
    [search],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retrieval"
        description="Hybrid search combining graph traversal, semantic embeddings, and lexical matching with Reciprocal Rank Fusion."
      >
        <Badge variant="outline" className="gap-1.5">
          <Search className="size-3" />
          Phase 12
        </Badge>
      </PageHeader>

      {/* Search bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium">Search Query</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search your knowledge base…"
                disabled={status !== 'ready'}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-10 w-full rounded-lg border px-3 text-sm outline-none disabled:opacity-50"
              />
            </div>
            <Button
              onClick={() => void search()}
              disabled={loading || query.trim() === '' || status !== 'ready'}
            >
              {loading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Search
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label className="text-muted-foreground text-xs">Mode:</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="border-input bg-background h-7 rounded-md border px-2 text-xs outline-none"
              >
                <option value="HYBRID">Hybrid</option>
                <option value="GRAPH">Graph Only</option>
                <option value="SEMANTIC">Semantic Only</option>
                <option value="LEXICAL">Lexical Only</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-muted-foreground text-xs">Top K:</label>
              <input
                type="number"
                value={topK}
                onChange={(e) => setTopK(Math.max(1, Math.min(100, Number(e.target.value) || 20)))}
                className="border-input bg-background h-7 w-16 rounded-md border px-2 text-xs outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              {[
                { label: 'Graph', value: enableGraph, setter: setEnableGraph, icon: GitBranch },
                {
                  label: 'Semantic',
                  value: enableSemantic,
                  setter: setEnableSemantic,
                  icon: Sparkles,
                },
                {
                  label: 'Lexical',
                  value: enableLexical,
                  setter: setEnableLexical,
                  icon: BookOpen,
                },
              ].map((toggle) => (
                <label
                  key={toggle.label}
                  className="flex cursor-pointer items-center gap-1.5 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={toggle.value}
                    onChange={(e) => toggle.setter(e.target.checked)}
                    className="accent-primary size-3"
                  />
                  <toggle.icon className="text-muted-foreground size-3" />
                  {toggle.label}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {error !== null && (
        <Card>
          <CardContent className="text-destructive flex items-center gap-2 py-4 text-sm">
            <CircleAlert className="size-4" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result !== null && (
        <>
          {/* Metrics */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1.5 text-[10px]">
              <Zap className="size-3" />
              {result.metrics.totalCandidates} candidates
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {result.metrics.finalCandidates} final
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {result.metrics.totalTimeMs}ms total
            </Badge>
            {result.metrics.graphCandidates > 0 && (
              <Badge variant="outline" className="border-violet-500/40 text-[10px]">
                Graph: {result.metrics.graphCandidates}
              </Badge>
            )}
            {result.metrics.semanticCandidates > 0 && (
              <Badge variant="outline" className="border-sky-500/40 text-[10px]">
                Semantic: {result.metrics.semanticCandidates}
              </Badge>
            )}
            {result.metrics.lexicalCandidates > 0 && (
              <Badge variant="outline" className="border-emerald-500/40 text-[10px]">
                Lexical: {result.metrics.lexicalCandidates}
              </Badge>
            )}
          </div>

          {/* Candidates */}
          <div className="space-y-2" aria-live="polite" aria-label="Search results">
            {result.candidates.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No results"
                description="Try a different query or adjust retrieval settings."
              />
            ) : (
              result.candidates.map((candidate) => (
                <CandidateCard
                  key={`${candidate.nodeId}-${candidate.rank}`}
                  candidate={candidate}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && result === null && !error && (
        <EmptyState
          icon={Search}
          title="Hybrid Retrieval Search"
          description="Combine graph, semantic, and lexical search with Reciprocal Rank Fusion. Select a mode and type a query to begin."
        />
      )}

      {/* Search history */}
      {historyLoaded && (
        <SearchHistoryPanel
          history={history}
          onRerun={rerunSearch}
          onRemove={removeHistoryEntry}
          onClear={clearAllHistory}
        />
      )}
    </div>
  )
}
