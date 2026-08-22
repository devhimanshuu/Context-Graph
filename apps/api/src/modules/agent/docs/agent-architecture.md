# ContextGraph Agent Orchestration — Phase 15

## Overview

ContextGraph's Agent Orchestration layer allows AI agents to:

- Understand user requests
- Determine what information is required
- Request context from ContextGraph
- Use approved tools
- Reason over authorized information
- Verify their results
- Produce a final answer

**Critical Security Principle**: The LLM is NOT the security boundary. ContextGraph remains the policy enforcement boundary.

## Architecture

```
User
  ↓
Agent API (POST /api/v1/agents/run)
  ↓
Agent Runtime (orchestrator)
  ↓
Intent Understanding (planner)
  ↓
Task Plan (steps, dependencies, limits)
  ↓
Agent State Machine (explicit states)
  ↓
Tool Selection + Authorization
  ↓
ContextGraph (permission engine + rule engine)
  ↓
Authorized Context
  ↓
Tool Execution (validated, authorized)
  ↓
Observations (structured, bounded)
  ↓
Verification (deterministic checks)
  ↓
Response Generation
  ↓
Final Response (grounded, verified)
```

## Module Structure

```
agent/
├── domain/               # Types and interfaces (dependency inversion)
│   ├── agent.types.ts    # Core domain types
│   └── agent.interfaces.ts  # Abstract classes for DI
├── state/                # State machine and state manager
│   ├── state-machine.ts  # Pure transition logic
│   └── agent-state.ts    # State persistence
├── runtime/
│   └── agent-runtime.ts  # Core orchestrator
├── planner/
│   └── agent-planner.ts  # Plan creation and updates
├── tools/                # Tool system
│   ├── tool-registry.ts  # Registration and discovery
│   ├── tool-authorizer.ts  # Permission checking
│   ├── tool-validator.ts # Input validation
│   ├── tool-executor.ts  # Full execution lifecycle
│   ├── loop-detector.ts  # Repetitive call detection
│   └── tools/            # Built-in tools
│       ├── context-search.tool.ts
│       ├── graph-explore.tool.ts
│       ├── knowledge-lookup.tool.ts
│       ├── policy-check.tool.ts
│       └── calculator.tool.ts
├── verification/
│   └── agent-verifier.ts # Post-generation verification
├── security/
│   └── injection-detector.ts  # Prompt injection defense
├── policies/
│   └── agent-policy.ts   # Capability model and limits
├── cost/
│   └── agent-cost-calculator.ts  # Token/cost tracking
├── memory/
│   └── in-memory-store.ts  # Short-term execution memory
├── approval/
│   └── human-approval.service.ts  # Human-in-the-loop
├── observability/
│   └── agent-observability.ts  # Metrics and analytics
├── repositories/
│   └── agent-execution.repository.ts  # Persistence
├── testing/
│   └── agent-security.spec.ts  # Security evaluation tests
├── agent.module.ts       # NestJS module composition
├── agent.controller.ts   # REST API
├── agent.dto.ts          # Request/response DTOs
└── agent.validation.ts   # Zod schemas
```

## State Machine

Agent execution uses explicit states with validated transitions:

```
PENDING → INITIALIZING → PLANNING
  ↓
PLANNING → REQUESTING_CONTEXT | EXECUTING_TOOL | VERIFYING | GENERATING_RESPONSE
  ↓
EXECUTING_TOOL → OBSERVING | AWAITING_APPROVAL
  ↓
OBSERVING → PLANNING | VERIFYING
  ↓
VERIFYING → GENERATING_RESPONSE
  ↓
GENERATING_RESPONSE → COMPLETED
```

Failure states (reachable from most active states):

- FAILED
- CANCELLED
- TIMEOUT
- POLICY_BLOCKED

**Invalid transitions are rejected — agents cannot skip authorization steps.**

## Security Model

### Authorization Flow

```
Agent proposes tool call
  ↓
Tool Input Validation (schema, types, size, format)
  ↓
Tool Authorization (capabilities, risk level, policy)
  ↓
ContextGraph Permission Engine
  ↓
Rule Engine (contextual rules)
  ↓
Execution with timeout
  ↓
Output scanning (injection detection)
  ↓
Authorized Result → Agent
```

### Key Security Properties

1. **Agents never control authorization** — all tool calls go through the authorization engine
2. **Organization context is immutable** — cannot be switched by model-generated arguments
3. **Every tool call is validated** — schema validation prevents arbitrary input
4. **Outputs are scanned for injection** — malicious tool output is treated as untrusted data
5. **Limits are enforced outside the LLM** — the agent cannot increase its own limits
6. **Chain-of-thought is never exposed** — only safe execution summaries appear in traces
7. **Fail-closed behavior** — authorization failures always deny

### Injection Defense

The system scans:

- User input
- Retrieved context (indirect injection)
- Tool outputs
- Final responses

Detection patterns include:

- "Ignore previous instructions"
- "New instructions:"
- Tool call injection (`exec()`, `eval()`)
- System prompt extraction attempts

### Tool Risk Classification

| Level                | Description         | Auto-Execute            |
| -------------------- | ------------------- | ----------------------- |
| READ_ONLY            | Read operations     | Yes                     |
| LOW_RISK_WRITE       | Non-critical writes | Policy-dependent        |
| HIGH_RISK_WRITE      | Critical writes     | Human approval          |
| EXTERNAL_SIDE_EFFECT | External actions    | Human approval required |

## API Endpoints

| Method | Path                                | Description              |
| ------ | ----------------------------------- | ------------------------ |
| POST   | /api/v1/agents/run                  | Execute an agent request |
| GET    | /api/v1/agents/executions/:id       | Get execution details    |
| GET    | /api/v1/agents/executions/:id/steps | Get execution steps      |
| GET    | /api/v1/agents/executions/:id/tools | Get tool calls           |
| GET    | /api/v1/agents/executions/:id/trace | Get execution trace      |
| GET    | /api/v1/agents/executions           | List user executions     |
| GET    | /api/v1/agents/analytics            | Get analytics            |
| POST   | /api/v1/agents/approvals/:id/decide | Approve/reject action    |

## Execution Limits

Configurable per-role:

| Role   | Max Iterations | Max Tool Calls | Max Cost |
| ------ | -------------- | -------------- | -------- |
| ADMIN  | 15             | 75             | $2.00    |
| HOD    | 12             | 60             | $1.50    |
| EDITOR | 10             | 50             | $1.00    |
| VIEWER | 8              | 30             | $0.50    |

Global limits:

- Max steps per plan: 20
- Max duration: 120 seconds
- Max tokens: 32,000
- Per-tool timeout: 30 seconds
- Loop detection threshold: 3 identical calls

## Evaluation Integration

The agent module integrates with Phase 14 (EvaluationModule) for:

- Task completion evaluation
- Tool selection quality
- Context selection quality
- Authorization safety
- Final answer quality
- Groundedness checking
- Citation quality
- Latency and cost tracking

## Dashboard

The Next.js dashboard provides:

- `/dashboard/agents` — Analytics overview and execution list
- `/dashboard/agents/run` — Run agent with request input and trace visualization
- `/dashboard/agents/[id]` — Full execution detail with steps, tools, observations, verifications

## Testing

Run all agent tests:

```bash
npm run test -w @contextgraph/api -- --filter agent
```

Security evaluation tests cover:

1. Prompt injection defense
2. Indirect prompt injection
3. Unauthorized tool request
4. Cross-tenant request
5. Tool argument manipulation
6. Organization switching attempt
7. Infinite loop detection
8. Tool spam detection
9. Sensitive data extraction
10. System prompt extraction
11. Malicious tool output
12. Unauthorized write action
