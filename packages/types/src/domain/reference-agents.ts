/* Reference Multi-Agent types — shared contracts for the reference agent system (Phase 15). */

import type { EntityId, Timestamp } from "../primitives";

// ─── Agent Roles ─────────────────────────────────────────────────────────

export const ReferenceAgentRole = {
  RESEARCH: "research",
  ANALYSIS: "analysis",
  DECISION: "decision",
  SYNTHESIS: "synthesis",
} as const;
export type ReferenceAgentRole =
  (typeof ReferenceAgentRole)[keyof typeof ReferenceAgentRole];

// ─── Agent Status ────────────────────────────────────────────────────────

export const ReferenceAgentStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
} as const;
export type ReferenceAgentStatus =
  (typeof ReferenceAgentStatus)[keyof typeof ReferenceAgentStatus];

// ─── Research Agent ──────────────────────────────────────────────────────

export interface ResearchContextReference {
  readonly nodeId: EntityId;
  readonly title: string;
  readonly type: string;
  readonly distance: number;
  readonly score: number | null;
  readonly inclusionReason: string;
}

export interface ResearchResult {
  readonly role: "research";
  readonly status: ReferenceAgentStatus;
  readonly findings: string;
  readonly contextReferences: readonly ResearchContextReference[];
  readonly sourceNodeIds: readonly EntityId[];
  readonly pipelineRunId: string | null;
  readonly contextItemsCount: number;
  readonly tokensUsed: number;
  readonly durationMs: number;
  readonly error: string | null;
}

// ─── Analysis Agent ──────────────────────────────────────────────────────

export interface AnalysisRisk {
  readonly category: string;
  readonly description: string;
  readonly severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface AnalysisResult {
  readonly role: "analysis";
  readonly status: ReferenceAgentStatus;
  readonly findings: string;
  readonly supportingSources: readonly EntityId[];
  readonly risks: readonly AnalysisRisk[];
  readonly unresolvedQuestions: readonly string[];
  readonly recommendedAction: string | null;
  readonly durationMs: number;
  readonly error: string | null;
}

// ─── Decision Agent ──────────────────────────────────────────────────────

export interface DecisionActionCheck {
  readonly action: string;
  readonly targetType: string;
  readonly decision: "ALLOW" | "DENY" | "REQUIRES_APPROVAL" | "ERROR";
  readonly riskLevel: string;
  readonly reasonCode: string | null;
  readonly explanation: string;
  readonly approvalRequired: boolean;
  readonly trace: readonly {
    readonly guardrail: string;
    readonly passed: boolean;
    readonly reason: string;
  }[];
}

export interface DecisionProposal {
  readonly proposalId: string | null;
  readonly decision:
    "PUBLISHED" | "PENDING_APPROVAL" | "REJECTED" | "DUPLICATE" | "FAILED";
  readonly nodeId: string | null;
  readonly validationTrace: readonly {
    readonly step: string;
    readonly passed: boolean;
  }[];
}

export interface DecisionResult {
  readonly role: "decision";
  readonly status: ReferenceAgentStatus;
  readonly proposedAction: string | null;
  readonly actionCheck: DecisionActionCheck | null;
  readonly proposal: DecisionProposal | null;
  readonly reasonCode: string;
  readonly explanation: string;
  readonly supportingSources: readonly EntityId[];
  readonly durationMs: number;
  readonly error: string | null;
}

// ─── Synthesis Agent ─────────────────────────────────────────────────────

export interface SynthesisCitation {
  readonly nodeId: EntityId;
  readonly title: string;
  readonly source: string;
}

export interface SynthesisResult {
  readonly role: "synthesis";
  readonly status: ReferenceAgentStatus;
  readonly answer: string;
  readonly citations: readonly SynthesisCitation[];
  readonly decisionSummary: string;
  readonly contextReferences: readonly EntityId[];
  readonly durationMs: number;
  readonly error: string | null;
}

// ─── Supervisor / Orchestrator ───────────────────────────────────────────

export type ReferenceAgentOutput =
  ResearchResult | AnalysisResult | DecisionResult | SynthesisResult;

export const ReferenceRunStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  TIMED_OUT: "TIMED_OUT",
} as const;
export type ReferenceRunStatus =
  (typeof ReferenceRunStatus)[keyof typeof ReferenceRunStatus];

export interface ReferenceAgentTraceStep {
  readonly agent: ReferenceAgentRole;
  readonly status: ReferenceAgentStatus;
  readonly toolCalls: readonly string[];
  readonly durationMs: number;
  readonly summary: string;
  readonly error: string | null;
}

export interface ReferenceRunResult {
  readonly runId: string;
  readonly userRequest: string;
  readonly status: ReferenceRunStatus;
  readonly trace: readonly ReferenceAgentTraceStep[];
  readonly research: ResearchResult | null;
  readonly analysis: AnalysisResult | null;
  readonly decision: DecisionResult | null;
  readonly synthesis: SynthesisResult | null;
  readonly totalDurationMs: number;
  readonly startedAt: Timestamp;
  readonly completedAt: Timestamp | null;
}
