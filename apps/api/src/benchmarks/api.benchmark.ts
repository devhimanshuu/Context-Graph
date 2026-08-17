import 'dotenv/config'

/**
 * Lightweight HTTP API benchmark: run `npm run bench:api` from apps/api with
 * the API running (default http://localhost:3001/api/v1, override with
 * API_BASE_URL). Measures p50/p95/p99 latency, throughput and error rate for
 * three representative endpoints. Informational only — no CI gate.
 */

const API_BASE = (process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1').replace(/\/$/, '')

async function sample(
  label: string,
  warmups: number,
  samples: number,
  request: () => Promise<{ status: number; ms: number }>,
): Promise<void> {
  for (let index = 0; index < warmups; index += 1) {
    await request()
  }

  const measurements: number[] = []
  let errors = 0
  for (let index = 0; index < samples; index += 1) {
    const result = await request()
    if (result.status >= 400) errors += 1
    measurements.push(result.ms)
  }

  measurements.sort((a, b) => a - b)
  const percentile = (q: number): number => {
    const index = Math.min(
      measurements.length - 1,
      Math.max(0, Math.ceil((q / 100) * measurements.length) - 1),
    )
    return measurements[index] ?? 0
  }
  const totalMs = measurements.reduce((sum, value) => sum + value, 0)
  const mean = totalMs / Math.max(measurements.length, 1)
  const throughput = samples / Math.max(totalMs / 1000, 0.001)
  const errorRate = (errors / Math.max(samples, 1)) * 100

  process.stdout.write(
    `${label.padEnd(28)} p50 ${percentile(50).toFixed(1).padStart(7)} ms  ` +
      `p95 ${percentile(95).toFixed(1).padStart(7)} ms  p99 ${percentile(99).toFixed(1).padStart(7)} ms  ` +
      `mean ${mean.toFixed(1).padStart(7)} ms  ~${throughput.toFixed(1).padStart(6)} req/s  ` +
      `${errorRate.toFixed(1)}% err\n`,
  )
}

async function run(): Promise<void> {
  const out = (line: string): void => {
    process.stdout.write(`${line}\n`)
  }

  out('=== ContextGraph API Benchmark ===')
  out(`target: ${API_BASE}`)
  out('')

  // Public bootstrap resolves the demo tenant; login yields a bearer token.
  const bootstrapResponse = await fetch(`${API_BASE}/demo/bootstrap`)
  const bootstrap = (await bootstrapResponse.json()) as {
    data: { organizationId: string; workspaceId: string; users: { email: string }[] }
  }
  const { organizationId, workspaceId } = bootstrap.data
  const email = bootstrap.data.users[0]?.email
  if (email === undefined) {
    throw new Error('No demo users available — seed the database first')
  }

  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId, email }),
  })
  const login = (await loginResponse.json()) as { data: { accessToken: string } }
  const headers = {
    Authorization: `Bearer ${login.data.accessToken}`,
    'Content-Type': 'application/json',
  }

  const nodesResponse = await fetch(`${API_BASE}/workspaces/${workspaceId}/nodes`, { headers })
  const nodes = (await nodesResponse.json()) as { data: { id: string }[] }
  const entryNodeId = nodes.data[0]?.id
  if (entryNodeId === undefined) {
    throw new Error('Workspace has no knowledge nodes — seed the database first')
  }

  out('endpoint'.padEnd(28) + 'latency (ms)                          throughput   errors')
  out('-'.repeat(96))

  await sample('GET /health', 10, 100, async () => {
    const startedAt = performance.now()
    const response = await fetch(`${API_BASE}/health`)
    return { status: response.status, ms: performance.now() - startedAt }
  })

  await sample('GET workspace nodes', 5, 50, async () => {
    const startedAt = performance.now()
    const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/nodes`, { headers })
    return { status: response.status, ms: performance.now() - startedAt }
  })

  await sample('POST /context/resolve', 3, 20, async () => {
    const startedAt = performance.now()
    const response = await fetch(`${API_BASE}/context/resolve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        workspaceId,
        entryNodeId,
        maxDepth: 3,
        strategy: 'bfs',
        tokenBudget: 2048,
        mode: 'STANDARD',
      }),
    })
    return { status: response.status, ms: performance.now() - startedAt }
  })

  out('')
  out('Done. Compare with docs/api.md performance notes.')
}

void run()
