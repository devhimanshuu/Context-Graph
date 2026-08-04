# Logging

## How it works

- `types.ts` defines the `Logger` contract that all business logic depends on.
- `console-logger.ts` is the current implementation: structured JSON lines to
  `stdout`/`stderr` with level filtering driven by the validated `LOG_LEVEL`
  env var.
- `index.ts` is the **only** place that constructs a concrete logger
  (`getLogger`, `logger`).

## Usage

```ts
import { getLogger } from '@/services/logging'

const log = getLogger('orders')
log.info('Order created', { orderId })
log.error('Failed to persist order', { error, orderId })
```

## Swapping the backend (Pino / Winston / Datadog / Sentry)

Replace the implementation in `index.ts` — no other module changes:

1. Install the library (e.g. `pino`).
2. Implement `Logger` or adapt the library to the interface (most libraries
   map 1:1: `debug/info/warn/error`).
3. Change the factory to return the new implementation, preserving the
   `child(context)` semantics.
4. For Sentry, attach a transport in `error` that reports
   `appError.cause`/stack for non-operational errors.

Because business code only ever sees the `Logger` interface, the migration is
a single-file change.
