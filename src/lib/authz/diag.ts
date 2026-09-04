import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * P07P-01: opt-in request diagnostics — SQL statement counts and timings per
 * operation, below the Payload boundary (counts adapter statements including
 * auth/population/count queries).
 *
 * Disabled unless LOREFORGE_DIAG=1. Never logs query literals, bodies,
 * passwords, tokens, or emails — only counts, tables, and elapsed time.
 */

export type DiagSnapshot = {
  statements: number
  totalMs: number
  byTable: Record<string, number>
}

type DiagState = { active: boolean; statements: number; totalMs: number; byTable: Record<string, number> }

const emptyState = (): DiagState => ({ active: false, statements: 0, totalMs: 0, byTable: {} })
// Diagnostics are request-local too. A module-global counter would mix two
// concurrent requests and make a benchmark's SQL totals meaningless.
const storage = new AsyncLocalStorage<DiagState>()

export function diagEnabled(): boolean {
  return storage.getStore()?.active === true
}

/** Begin counting. Returns the previous state to restore on end(). */
export function beginDiag(): DiagSnapshot | null {
  if (!process.env.LOREFORGE_DIAG) return null
  const previousState = storage.getStore() ?? emptyState()
  const previous: DiagSnapshot = { statements: previousState.statements, totalMs: previousState.totalMs, byTable: { ...previousState.byTable } }
  storage.enterWith({ active: true, statements: 0, totalMs: 0, byTable: {} })
  return previous
}

/** Stop counting and return the totals for the measured window. */
export function endDiag(previous: DiagSnapshot | null): DiagSnapshot | null {
  if (previous === null) return null
  const current = storage.getStore() ?? emptyState()
  const result: DiagSnapshot = { statements: current.statements, totalMs: current.totalMs, byTable: { ...current.byTable } }
  storage.enterWith({ active: false, statements: previous.statements, totalMs: previous.totalMs, byTable: previous.byTable })
  return result
}

/** Record one statement (called by the instrumented client wrapper). */
export function recordStatement(sql: string, elapsedMs: number): void {
  const state = storage.getStore()
  if (!state?.active) return
  state.statements += 1
  state.totalMs += elapsedMs
  const match = /(?:from|into|update|join)\s+`?([a-z_][a-z0-9_]*)`?/i.exec(sql)
  if (match) {
    const table = match[1]
    state.byTable[table] = (state.byTable[table] ?? 0) + 1
  }
}

/** Wrap a libsql-style client so every execute() is counted. */
export function instrumentClient<T extends { execute: (sql: string) => Promise<unknown> }>(client: T): T {
  const wrapped = {
    execute: async (sql: string) => {
      const started = performance.now()
      try {
        return await client.execute(sql)
      } finally {
        recordStatement(sql, performance.now() - started)
      }
    },
  } as unknown as T
  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === 'execute') return (wrapped as Record<string, unknown>).execute
      const value = Reflect.get(target, property, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  }) as T
}

export function formatDiag(label: string, snapshot: DiagSnapshot): string {
  const tables = Object.entries(snapshot.byTable).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([table, count]) => `${table}×${count}`).join(', ')
  return `${label}: ${snapshot.statements} statements, ${snapshot.totalMs.toFixed(1)} ms db${tables ? ` [${tables}]` : ''}`
}
