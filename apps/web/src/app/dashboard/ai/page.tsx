'use client'

import * as React from 'react'
import {
  BrainCircuit,
  Send,
  LoaderCircle,
  Quote,
  CircleAlert,
  Sparkles,
  Square,
  Zap,
  History,
  Plus,
  Trash2,
  Pencil,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { useApi } from '@/components/dashboard/api-provider'
import { useApiQuery } from '@/hooks/use-api-query'
import { useKnowledgeNodes } from '@/hooks/use-api-query'
import type { AiResponse, ConversationSummary, StoredChatMessage } from '@/lib/api/types'

// ---------------------------------------------------------------------------
// Streaming cursor — animated blinking bar shown during token generation
// ---------------------------------------------------------------------------
function StreamingCursor() {
  return (
    <span
      className="inline-block w-0.5 animate-pulse bg-current align-middle"
      style={{ height: '1.1em' }}
    />
  )
}

// ---------------------------------------------------------------------------
// Citation deep-link — jumps to the knowledge node detail page
// ---------------------------------------------------------------------------
function CitationChip({ citation }: { citation: { nodeId: string; title: string } }) {
  return (
    <a
      href={`/dashboard/knowledge-graph?focus=${encodeURIComponent(citation.nodeId)}`}
      className="bg-background/50 hover:bg-background flex items-start gap-2 rounded-md px-2 py-1.5 text-xs transition-colors"
      title={`Open ${citation.title}`}
    >
      <Badge variant="outline" className="mt-0.5 shrink-0 text-[9px]">
        source
      </Badge>
      <span className="min-w-0">
        <span className="block truncate font-medium underline-offset-2 group-hover:underline">
          {citation.title}
        </span>
      </span>
    </a>
  )
}

// ---------------------------------------------------------------------------
// Chat message bubble
// ---------------------------------------------------------------------------
function ChatBubble({
  role,
  content,
  citations,
  latencyMs,
  model,
  streaming = false,
  tokenCount,
}: {
  role: 'user' | 'assistant'
  content: string
  citations?: ReadonlyArray<{ nodeId: string; title: string }>
  latencyMs?: number
  model?: string
  streaming?: boolean
  tokenCount?: number
}) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-3xl rounded-xl px-4 py-3 text-sm ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        <div className="leading-relaxed whitespace-pre-wrap">
          {content}
          {streaming && <StreamingCursor />}
        </div>

        {citations !== undefined && citations.length > 0 && (
          <div className="border-border/50 mt-3 space-y-1.5 border-t pt-2">
            <p className="text-muted-foreground flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase">
              <Quote className="size-3" />
              Citations
            </p>
            {citations.map((citation) => (
              <CitationChip key={`${citation.nodeId}`} citation={citation} />
            ))}
          </div>
        )}

        {latencyMs !== undefined && model !== undefined && (
          <p className="text-muted-foreground mt-2 flex items-center gap-2 text-[10px]">
            <span>{model}</span>
            <span>·</span>
            <span>{Math.round(latencyMs)}ms</span>
            {tokenCount !== undefined && tokenCount > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <Zap className="size-2.5" />
                  {tokenCount} tokens
                </span>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

/** Maps a persisted message to the bubble shape. */
function storedToBubble(message: StoredChatMessage) {
  return {
    role: message.role === 'USER' ? ('user' as const) : ('assistant' as const),
    content: message.content,
    citations: message.role === 'ASSISTANT' ? message.citations : undefined,
    tokenCount:
      message.role === 'ASSISTANT' && typeof message.metadata.totalTokens === 'number'
        ? (message.metadata.totalTokens as number)
        : undefined,
  }
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AiChatPage() {
  const { client, bootstrap, status } = useApi()
  const queryClient = useQueryClient()
  const workspaceId = bootstrap?.workspaceId ?? null
  const nodes = useKnowledgeNodes(workspaceId)
  const nodeList = React.useMemo(() => nodes.data ?? [], [nodes.data])

  const [query, setQuery] = React.useState('')
  const [entryNodeId, setEntryNodeId] = React.useState('')
  const [messages, setMessages] = React.useState<
    {
      role: 'user' | 'assistant'
      content: string
      citations?: ReadonlyArray<{ nodeId: string; title: string }>
      latencyMs?: number
      model?: string
      tokenCount?: number
    }[]
  >([])
  const [streaming, setStreaming] = React.useState(false)
  const [streamContent, setStreamContent] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [conversationId, setConversationId] = React.useState<string | null>(null)
  const [streamTokenCount, setStreamTokenCount] = React.useState(0)
  const [renamingId, setRenamingId] = React.useState<string | null>(null)
  const [renameValue, setRenameValue] = React.useState('')
  const abortRef = React.useRef<AbortController | null>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Persisted conversation list — invalidated after each completed turn.
  const conversationsQuery = useApiQuery<ConversationSummary[]>(
    ['conversations'],
    (api) => api.conversations(50),
    {
      staleTime: 5_000,
    },
  )

  // Auto-scroll during streaming
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamContent])

  // Auto-select first node
  React.useEffect(() => {
    if (entryNodeId === '' && nodeList.length > 0) {
      setEntryNodeId(nodeList[0]?.id ?? '')
    }
  }, [nodeList, entryNodeId])

  const invalidateConversations = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['conversations'] })
  }, [queryClient])

  // Stop streaming
  const stopStreaming = React.useCallback(() => {
    if (abortRef.current !== null) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (abortRef.current !== null) abortRef.current.abort()
    }
  }, [])

  const send = React.useCallback(async () => {
    if (client === null || query.trim() === '' || entryNodeId === '' || workspaceId === null) return

    const userMessage = query.trim()
    setQuery('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setStreaming(true)
    setStreamContent('')
    setStreamTokenCount(0)
    setError(null)

    let accumulated = ''
    let tokenCount = 0
    let finalResult: AiResponse | null = null

    try {
      const generator = client.aiChatStream({
        userQuery: userMessage,
        entryNodeId,
        workspaceId,
        conversationId: conversationId ?? undefined,
      })

      for await (const event of generator) {
        if (event.type === 'chunk') {
          accumulated += event.delta
          tokenCount += 1
          setStreamContent(accumulated)
          setStreamTokenCount(tokenCount)
        } else if (event.type === 'done') {
          finalResult = event.result
          if (event.result.conversationId) {
            setConversationId(event.result.conversationId)
          }
        } else if (event.type === 'error') {
          setError(event.error)
        }
      }

      // Commit the streamed message
      if (finalResult !== null) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: finalResult!.answer,
            citations: finalResult!.citations.map((c) => ({ nodeId: c.nodeId, title: c.title })),
            latencyMs: finalResult!.latencyMs,
            model: finalResult!.model,
            tokenCount: finalResult!.usage?.totalTokens ?? tokenCount,
          },
        ])
      } else if (accumulated.length > 0) {
        // Fallback: use accumulated content even without a done event
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: accumulated,
            tokenCount,
          },
        ])
      }
      await invalidateConversations()
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled — commit what we have
        if (accumulated.length > 0) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: accumulated + '\n\n*[Stopped by user]*',
              tokenCount,
            },
          ])
        }
      } else {
        setError(err instanceof Error ? err.message : 'AI request failed')
      }
    } finally {
      setStreaming(false)
      setStreamContent('')
      setStreamTokenCount(0)
      abortRef.current = null
    }
  }, [client, query, entryNodeId, workspaceId, conversationId, invalidateConversations])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (streaming) {
          stopStreaming()
        } else {
          void send()
        }
      }
    },
    [send, streaming, stopStreaming],
  )

  // Resume a persisted conversation
  const resumeConversation = React.useCallback(
    async (id: string) => {
      if (client === null) return
      stopStreaming()
      try {
        const detail = await client.conversation(id)
        setConversationId(detail.id)
        setMessages(detail.messages.filter((m) => m.role !== 'SYSTEM').map(storedToBubble))
        setError(null)
        // Restore the entry node used in this conversation if present.
        const lastMeta = [...detail.messages]
          .reverse()
          .find((m) => m.role === 'ASSISTANT' && typeof m.metadata.entryNodeId === 'string')
        if (lastMeta !== undefined && typeof lastMeta.metadata.entryNodeId === 'string') {
          setEntryNodeId(lastMeta.metadata.entryNodeId)
        }
      } catch (err) {
        toast.error('Could not load conversation', {
          description: err instanceof Error ? err.message : undefined,
        })
      }
    },
    [client, stopStreaming],
  )

  // Start a new conversation
  const startNew = React.useCallback(() => {
    stopStreaming()
    setConversationId(null)
    setMessages([])
    setError(null)
  }, [stopStreaming])

  // Delete a conversation
  const deleteConversation = React.useCallback(
    async (id: string) => {
      if (client === null) return
      try {
        await client.deleteConversation(id)
        toast.success('Conversation deleted')
        if (conversationId === id) {
          startNew()
        }
        void conversationsQuery.refetch()
      } catch (err) {
        toast.error('Delete failed', {
          description: err instanceof Error ? err.message : undefined,
        })
      }
    },
    [client, conversationId, startNew, conversationsQuery],
  )

  // Rename a conversation
  const submitRename = React.useCallback(
    async (id: string) => {
      if (client === null) return
      const title = renameValue.trim()
      setRenamingId(null)
      if (title === '') return
      try {
        await client.renameConversation(id, title)
        toast.success('Conversation renamed')
        void conversationsQuery.refetch()
      } catch (err) {
        toast.error('Rename failed', {
          description: err instanceof Error ? err.message : undefined,
        })
      }
    },
    [client, renameValue, conversationsQuery],
  )

  const conversations = conversationsQuery.data ?? []

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title="AI Chat"
        description="Conversational AI powered by ContextGraph — every response is grounded in authorized context."
      >
        <Badge variant="outline" className="gap-1.5">
          <BrainCircuit className="size-3" />
          Streaming
        </Badge>
      </PageHeader>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* History sidebar */}
        <div className="hidden w-60 shrink-0 flex-col gap-3 md:flex">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={startNew}
            disabled={streaming}
          >
            <Plus className="size-4" />
            New chat
          </Button>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            <p className="text-muted-foreground flex items-center gap-1 px-1 text-[10px] font-medium tracking-wider uppercase">
              <History className="size-3" />
              History
            </p>
            {conversations.length === 0 && (
              <p className="text-muted-foreground px-1 py-2 text-xs">
                No conversations yet — your chats will appear here.
              </p>
            )}
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors ${
                  conversationId === conversation.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
              >
                {renamingId === conversation.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void submitRename(conversation.id)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    onBlur={() => void submitRename(conversation.id)}
                    className="bg-background h-6 w-full rounded border px-1 text-xs outline-none"
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void resumeConversation(conversation.id)}
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                      title={conversation.title}
                    >
                      <MessageSquare className="size-3 shrink-0 opacity-60" />
                      <span className="truncate">{conversation.title}</span>
                    </button>
                    <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                      <button
                        type="button"
                        aria-label="Rename conversation"
                        className="text-muted-foreground hover:text-foreground rounded p-0.5"
                        onClick={() => {
                          setRenamingId(conversation.id)
                          setRenameValue(conversation.title)
                        }}
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete conversation"
                        className="text-muted-foreground hover:text-destructive rounded p-0.5"
                        onClick={() => void deleteConversation(conversation.id)}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Configuration</CardTitle>
              <CardDescription>Entry point for context retrieval</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium">Entry Node</label>
                <select
                  value={entryNodeId}
                  onChange={(e) => setEntryNodeId(e.target.value)}
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full items-center rounded-lg border px-2.5 text-sm outline-none"
                >
                  <option value="">Select a node…</option>
                  {nodeList.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.title}
                    </option>
                  ))}
                </select>
              </div>
              {streaming && (
                <Badge variant="outline" className="gap-1.5 border-amber-500/40 text-[10px]">
                  <LoaderCircle className="size-3 animate-spin" />
                  Streaming…
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <Sparkles className="size-3.5" />
                How it works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="text-muted-foreground space-y-2 text-xs">
                <li>1. Select an entry node for context</li>
                <li>2. Ask a question about your knowledge</li>
                <li>3. ContextGraph retrieves authorized context</li>
                <li>4. The AI streams a grounded response</li>
                <li>5. Citations link back to source nodes</li>
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Chat area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Card className="flex flex-1 flex-col overflow-hidden">
            <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
              {/* Messages */}
              <div
                className="flex-1 space-y-4 overflow-y-auto p-4"
                aria-live="polite"
                aria-label="Chat messages"
              >
                {messages.length === 0 && !streaming && (
                  <EmptyState
                    icon={BrainCircuit}
                    title="Ask anything about your knowledge"
                    description="Select an entry node and type your question. The AI will retrieve authorized context and stream a grounded response in real-time."
                  />
                )}

                {messages.map((msg, index) => (
                  <ChatBubble
                    key={index}
                    role={msg.role}
                    content={msg.content}
                    citations={msg.citations}
                    latencyMs={msg.latencyMs}
                    model={msg.model}
                    tokenCount={msg.tokenCount}
                  />
                ))}

                {/* Active streaming bubble */}
                {streaming && streamContent.length > 0 && (
                  <ChatBubble
                    role="assistant"
                    content={streamContent}
                    streaming={true}
                    tokenCount={streamTokenCount}
                  />
                )}

                {/* Loading indicator before first token */}
                {streaming && streamContent.length === 0 && (
                  <div className="flex justify-start">
                    <div className="bg-muted flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
                      <LoaderCircle className="size-4 animate-spin" />
                      <span>Retrieving context & generating…</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {error !== null && (
                <div className="mx-4 mb-2 flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                  <CircleAlert className="size-3.5 shrink-0" />
                  {error}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-5 px-1.5"
                    onClick={() => setError(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              {/* Input */}
              <div className="border-t p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      status !== 'ready'
                        ? 'Connect to the API first…'
                        : entryNodeId === ''
                          ? 'Select an entry node first…'
                          : streaming
                            ? 'Press Enter to stop…'
                            : 'Ask a question…'
                    }
                    disabled={status !== 'ready' || entryNodeId === ''}
                    rows={1}
                    className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex max-h-32 min-h-[40px] w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none disabled:opacity-50"
                  />
                  {streaming ? (
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={stopStreaming}
                      aria-label="Stop generation"
                    >
                      <Square className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      onClick={() => void send()}
                      disabled={query.trim() === '' || entryNodeId === '' || status !== 'ready'}
                    >
                      <Send className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
