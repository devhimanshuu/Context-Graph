# AI Architecture — ContextGraph AI Context Layer

Phase 11 implements the AI Context Layer on top of the existing deterministic ContextGraph infrastructure.

## Core Principle

**ContextGraph decides WHAT enters the AI context. The LLM decides HOW to use that context.**

The LLM must NEVER determine what information the user is authorized to access.

## Architecture Overview

```mermaid
flowchart TD
    A[User Request] --> B[Authentication]
    B --> C[ContextGraph Pipeline]
    C --> D[Graph Traversal]
    D --> E[Authorization]
    E --> F[Deterministic Rules]
    F --> G[Candidate Builder]
    G --> H[Context Assembly]
    H --> I[Context Budget]
    I --> J[Prompt Builder]
    J --> K[Model Gateway]
    K --> L[LLM Provider]
    L --> M[Response Validation]
    M --> N[Citation Validation]
    N --> O[AI Response]

    style A fill:#e1f5fe
    style C fill:#f3e5f5
    style K fill:#e8f5e8
    style O fill:#fff3e0
```

## Security Architecture

```mermaid
flowchart LR
    A[User Query] -->|Input| B[ContextGraph]
    B -->|Authorized Context| C[AI Layer]
    C -->|Structured Prompt| D[LLM]
    D -->|Response| E[Validation]
    E -->|Validated| F[User]

    G[Knowledge Content] -->|Data Only| C
    H[System Instructions] -->|Authority| C

    style A fill:#e1f5fe
    style G fill:#fce4ec
    style H fill:#e8f5e8
```

## Module Structure

```
apps/api/src/modules/ai/
├── domain/
│   ├── ai.types.ts          # Core domain types
│   └── ai.interfaces.ts     # Service interfaces
├── services/
│   ├── ai.service.ts        # Main orchestrator
│   ├── context-assembler.service.ts
│   ├── context-budget-manager.service.ts
│   ├── token-estimator.service.ts
│   ├── context-compressor.service.ts
│   ├── prompt-builder.service.ts
│   ├── model-router.service.ts
│   ├── citation-validator.service.ts
│   ├── response-validator.service.ts
│   ├── context-hasher.service.ts
│   └── cost-calculator.service.ts
├── adapters/
│   ├── groq.adapter.ts      # Groq (OpenAI-compatible)
│   ├── openrouter.adapter.ts # OpenRouter (multi-provider)
│   └── ollama.adapter.ts    # Ollama (local)
├── controllers/
│   └── ai.controller.ts     # API endpoints
├── dto/
│   └── ai-chat-request.dto.ts
└── ai.module.ts             # Module composition
```

## API Endpoint

```
POST /api/v1/ai/chat
```

Request:

- userQuery: The user's question
- entryNodeId: Starting node for context retrieval
- workspaceId: Workspace scope
- conversationId: Optional conversation thread
- conversationHistory: Previous turns
- configuration: Optional model overrides

Response:

- answer: Generated response
- citations: Validated citations
- model: Model used
- provider: Provider used
- usage: Token usage and cost
- contextVersion: Context version
- contextHash: Deterministic context hash
- promptHash: Deterministic prompt hash
- latencyMs: Response latency
- requestId: Request identifier
- pipelineVersion: Pipeline version

## Context Assembly Pipeline

```mermaid
flowchart TD
    A[CandidateSet] --> B[ContextAssembler]
    B --> C[Priority Assignment]
    C --> D[Deterministic Ordering]
    D --> E[Source Attribution]
    E --> F[AssembledContext]
    F --> G[ContextBudgetManager]
    G --> H[Budget Fitting]
    H --> I[BudgetedContext]
    I --> J[PromptBuilder]
    J --> K[StructuredPrompt]

    style A fill:#e1f5fe
    style F fill:#f3e5f5
    style I fill:#e8f5e8
    style K fill:#fff3e0
```

## Priority Tiers

| Tier     | Threshold       | Budget Behavior                                  |
| -------- | --------------- | ------------------------------------------------ |
| CRITICAL | importance ≥ 90 | Never removed unless individually exceeds budget |
| HIGH     | importance ≥ 70 | Preferred over NORMAL/LOW                        |
| NORMAL   | distance ≤ 1    | Standard inclusion                               |
| LOW      | default         | First to be excluded                             |

## Provider Architecture

```mermaid
flowchart TD
    A[ModelRouter] --> B{Primary Provider}
    B -->|Available| C[Groq]
    B -->|Unavailable| D{Fallback 1}
    D -->|Available| E[OpenRouter]
    D -->|Unavailable| F{Fallback 2}
    F -->|Available| G[Ollama]
    F -->|Unavailable| H[Error]

    C --> I[Response]
    E --> I
    G --> I

    style A fill:#e1f5fe
    style C fill:#e8f5e8
    style E fill:#f3e5f5
    style G fill:#fff3e0
```

## Prompt Injection Defense

The architecture defends against prompt injection through:

1. **Instruction Hierarchy**: System instructions > Context data > User query
2. **Context Boundaries**: All knowledge content wrapped in `<context>` tags
3. **Data Treatment**: Knowledge content treated as untrusted data
4. **User Query Isolation**: User queries cannot modify authorization
5. **Validation**: Response validation for forbidden patterns

## Token Budget Management

```mermaid
flowchart TD
    A[AssembledContext] --> B[Sort by Priority]
    B --> C{Check Constraints}
    C -->|Within Budget| D[Include Item]
    C -->|Exceeds Budget| E[Exclude Item]
    D --> F[Update Budget]
    F --> C
    E --> G[Record Reason]
    G --> C
    C -->|All Processed| H[BudgetFitResult]

    style A fill:#e1f5fe
    style H fill:#e8f5e8
```

## Cost Control

| Provider   | Model         | Input Cost | Output Cost |
| ---------- | ------------- | ---------- | ----------- |
| Groq       | llama-3.3-70b | $0.59/1M   | $0.79/1M    |
| OpenRouter | llama-3.3-70b | $0.35/1M   | $0.40/1M    |
| Ollama     | local         | $0         | $0          |

## Configuration

Environment variables:

```bash
# Provider Selection
AI_PRIMARY_PROVIDER=GROQ
AI_FALLBACK_PROVIDERS=OPENROUTER,OLLAMA

# API Keys
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...

# Cost Limits
AI_MAX_COST_PER_REQUEST=0.10
AI_MAX_COST_PER_USER=1.00
AI_MAX_COST_PER_ORG=10.00

# Local Models
OLLAMA_BASE_URL=http://localhost:11434
```

## Testing Strategy

### Unit Tests

- ContextAssembler: priority assignment, ordering, hashing
- ContextBudgetManager: budget fitting, constraint enforcement
- TokenEstimator: provider-independent estimation
- CitationValidator: citation detection and validation
- ResponseValidator: structure and content validation

### Security Tests

- Prompt injection in knowledge content
- Instruction hierarchy preservation
- Authorization bypass attempts
- Cross-tenant data leakage

### Integration Tests

- Full pipeline: ContextPackage → AI Response
- Provider fallback scenarios
- Cost budget enforcement

## Observability

Tracked metrics:

- Model calls per provider
- Latency per request
- Token usage
- Cost per request
- Citation validation failures
- Circuit breaker state changes

## Documentation

- [Context Assembly](./context-assembly.md)
- [Model Gateway](./model-gateway.md)
- [AI Security](./ai-security.md)
