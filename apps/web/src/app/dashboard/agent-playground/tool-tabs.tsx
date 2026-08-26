'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { ToolExec, ActivityEntry } from '@/hooks/use-playground'
import { ResolveContextPanel } from './panels/resolve-context-panel'
import { CheckActionPanel } from './panels/check-action-panel'
import { ProposeNodePanel } from './panels/propose-node-panel'
import { GraphExplorerPanel } from './panels/graph-explorer-panel'
import { RunsPanel } from './panels/runs-panel'
import { ReplayPanel } from './panels/replay-panel'
import { ConnectionGuidePanel } from './panels/connection-guide-panel'
import { DemoWalkthrough } from './panels/demo-walkthrough-panel'
import {
  Search,
  ShieldAlert,
  FileText,
  GitBranch,
  RotateCcw,
  Play,
  Wrench,
  BookOpen,
  Rocket,
} from 'lucide-react'

type ToolTab =
  | 'demo'
  | 'guide'
  | 'resolve_context'
  | 'check_action'
  | 'propose_node'
  | 'graph'
  | 'runs'
  | 'replay'

const TOOL_TABS: { id: ToolTab; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: 'demo',
    label: 'Demo Walkthrough',
    icon: Rocket,
    description: 'Interactive guided tutorial',
  },
  {
    id: 'guide',
    label: 'Connect Agent',
    icon: BookOpen,
    description: 'Step-by-step MCP connection guide',
  },
  {
    id: 'resolve_context',
    label: 'Resolve Context',
    icon: Search,
    description: 'Retrieve governed organizational context',
  },
  {
    id: 'check_action',
    label: 'Check Action',
    icon: ShieldAlert,
    description: 'Evaluate action authorization',
  },
  {
    id: 'propose_node',
    label: 'Propose Node',
    icon: FileText,
    description: 'Propose governed knowledge',
  },
  {
    id: 'graph',
    label: 'Graph Explorer',
    icon: GitBranch,
    description: 'Inspect authorized subgraph',
  },
  { id: 'runs', label: 'Pipeline Runs', icon: Play, description: 'Inspect pipeline executions' },
  { id: 'replay', label: 'Replay Run', icon: RotateCcw, description: 'Replay a pipeline run' },
]

interface ToolTabsProps {
  workspaceId: string
  toolExec: ToolExec
  addEntry: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void
}

export function ToolTabs({ workspaceId, toolExec, addEntry }: ToolTabsProps) {
  const [activeTab, setActiveTab] = useState<ToolTab>('resolve_context')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Tab Bar */}
      <div className="bg-muted/30 flex items-center gap-1 overflow-x-auto rounded-t-lg border border-b-0 px-2 py-1.5">
        <Wrench className="text-muted-foreground mr-1 h-4 w-4 shrink-0" />
        {TOOL_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>
      {/* Tab Content */}{' '}
      <Card className="min-h-0 flex-1 rounded-t-none border-t-0">
        <CardContent className="min-h-0 flex-1 overflow-y-auto p-4">
          {activeTab === 'demo' && (
            <DemoWalkthrough workspaceId={workspaceId} toolExec={toolExec} addEntry={addEntry} />
          )}
          {activeTab === 'guide' && <ConnectionGuidePanel />}
          {activeTab === 'resolve_context' && (
            <ResolveContextPanel
              workspaceId={workspaceId}
              toolExec={toolExec}
              addEntry={addEntry}
            />
          )}
          {activeTab === 'check_action' && (
            <CheckActionPanel toolExec={toolExec} addEntry={addEntry} />
          )}
          {activeTab === 'propose_node' && (
            <ProposeNodePanel workspaceId={workspaceId} toolExec={toolExec} addEntry={addEntry} />
          )}
          {activeTab === 'graph' && (
            <GraphExplorerPanel workspaceId={workspaceId} toolExec={toolExec} addEntry={addEntry} />
          )}
          {activeTab === 'runs' && <RunsPanel toolExec={toolExec} addEntry={addEntry} />}
          {activeTab === 'replay' && <ReplayPanel toolExec={toolExec} addEntry={addEntry} />}
        </CardContent>
      </Card>
    </div>
  )
}
