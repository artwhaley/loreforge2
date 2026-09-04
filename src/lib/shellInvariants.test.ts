import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

/**
 * P05R-T07 static regression module (DEF-SHELL-01 owner).
 *
 * These invariants cannot be exercised by DOM tests (the shell is a server
 * component under Payload auth), so they are pinned against the source tree:
 * navigation order, single Domain selector, redirect-shim purity, route-level
 * residue, retired-concept negatives, and the Share placeholder posture.
 * Persona rendering (logged-out / zero-Character / member / manager / admin /
 * owner / Platform Admin) remains a manual gate walkthrough per DEF-SHELL-01.
 */

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src')
const PACKET = path.join(ROOT, 'LoreForge_Execution_Packet')

const PRUNE = new Set(['node_modules', '.next', '.git', '.cache'])

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (!PRUNE.has(entry)) out.push(...walk(full))
    } else {
      out.push(full)
    }
  }
  return out
}

const rel = (p: string) => path.relative(ROOT, p).replaceAll(path.sep, '/')
const read = (p: string) => readFileSync(p, 'utf8')

test('TenantShell exposes exactly one Domain selector and the frozen primary nav order', () => {
  const shell = read(path.join(SRC, 'components/theme/TenantShell.tsx'))
  // Exactly one Domain selector (label + select + switch button), not a mode toggle.
  const selectorCount = (shell.match(/id="tenant-switcher"/g) ?? []).length
  assert.equal(selectorCount, 1, 'exactly one Domain selector control')
  // No Administration-mode entry point in the shell.
  assert.ok(!/Administration mode|Enter administration|Exit administration/i.test(shell), 'no Administration-mode entry')
  // Frozen primary nav: Home/About/Departments/Records in order.
  const navLabels = [...shell.matchAll(/\{ label: '([^']+)', segment: '([^']*)' \}/g)].map((m) => m[1])
  assert.deepEqual(navLabels, ['Home', 'About', 'Departments', 'Records'], 'primary nav order frozen')
})

test('no customer page imports creep back into the /tenant legacy tree', () => {
  const tenantTree = path.join(SRC, 'app/(frontend)/tenant')
  for (const file of walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f))) {
    const relative = rel(file)
    if (relative === 'src/lib/shellInvariants.test.ts') continue // this module names the tree on purpose
    if (relative.startsWith('src/app/(frontend)/tenant/')) continue // shims may self-reference only
    const content = read(file)
    assert.ok(
      !content.includes('app/(frontend)/tenant'),
      `${relative} must not import from the legacy /tenant tree`,
    )
  }
})

test('legacy /tenant and /domain/*/subdomains trees are pure redirect shims', () => {
  const shimTrees = [
    path.join(SRC, 'app/(frontend)/tenant'),
    path.join(SRC, 'app/(frontend)/domain/[slug]/subdomains'),
  ]
  for (const tree of shimTrees) {
    const files = walk(tree).filter((f) => f.endsWith('.tsx'))
    assert.ok(files.length > 0, `shim tree exists: ${rel(tree)}`)
    for (const file of files) {
      const content = read(file)
      const relative = rel(file)
      assert.ok(content.includes("next/navigation"), `${relative} imports redirect`)
      assert.ok(content.includes('redirect('), `${relative} redirects`)
      assert.ok(
        content.includes('Legacy compatibility shim') || content.includes('redirects to the canonical'),
        `${relative} is marked a legacy shim`,
      )
      // Shim must not render a page or import app components.
      assert.ok(!content.includes('<TenantShell'), `${relative} renders no shell`)
    }
  }
})

test('dead route handlers and retired-concept residue are absent', () => {
  const forbiddenSegments = ['subdomain-memberships', 'switch-administration', 'document-copies', 'document-moves']
  const appFiles = walk(path.join(SRC, 'app')).filter((f) => /\.(ts|tsx)$/.test(f))
  for (const file of appFiles) {
    const relative = rel(file)
    for (const segment of forbiddenSegments) {
      assert.ok(!relative.includes(segment), `${segment} route must not exist (found ${relative})`)
    }
  }
  // No Administration-mode vocabulary anywhere in non-test application code.
  const codeFiles = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes('.test.'))
  for (const file of codeFiles) {
    const content = read(file)
    const relative = rel(file)
    assert.ok(
      !/Administration mode|Enter administration|Exit administration|switch-administration/i.test(content),
      `${relative} contains retired Administration-mode vocabulary`,
    )
  }
})

test('customer document view: Share is a disabled placeholder and Copy/Move/transfer is absent', () => {
  const page = read(path.join(SRC, 'app/(frontend)/domain/[slug]/documents/[id]/page.tsx'))
  // Share is visibly deferred: disabled control citing the owner decision.
  assert.ok(page.includes('Share — planned'), 'Share control is a placeholder')
  assert.ok(page.includes('aria-disabled="true"'), 'Share control is disabled')
  assert.ok(page.includes('CC-2026-09-03-04'), 'Share placeholder cites the deferral decision')
  // The only mutation affordances on the record view are supersede/delete.
  assert.ok(!/document-copies|document-moves|>Copy<|>Move<|transfer/i.test(page), 'no Copy/Move/transfer control')
})

test('document-shares endpoint performs no grant or revoke', () => {
  const route = read(path.join(SRC, 'app/(payload)/api/document-shares/route.ts'))
  assert.ok(route.includes('share_unavailable'), 'endpoint answers share_unavailable')
  assert.ok(route.includes('403'), 'endpoint refuses with 403')
  assert.ok(!route.includes("@/lib/documents/sharing"), 'temporary share service is not invoked')
  assert.ok(!route.includes('authorizeSharedDocumentAccess'), 'share adapter is not invoked')
  assert.ok(!route.includes('payload'), 'no Payload mutation machinery is imported')
  assert.ok(!/\.(create|delete|update|findByID)\(/.test(route), 'no grant/revoke code path')
})

test('deferred-work register rows all carry an owning ticket and are cross-referenced', () => {
  const register = read(path.join(PACKET, '11_DEFERRED_WORK_REGISTER.md'))
  const rows = [...register.matchAll(/^\| (DEF-[A-Z0-9-]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| (OPEN|CLOSED|DONE) \|$/gm)]
  assert.ok(rows.length >= 15, `register holds its rows (found ${rows.length})`)
  // Search corpus: everything outside the register itself and generated dirs.
  const corpusFiles = walk(ROOT).filter(
    (f) =>
      /\.(md|ts|tsx)$/.test(f) &&
      rel(f) !== 'LoreForge_Execution_Packet/11_DEFERRED_WORK_REGISTER.md' &&
      rel(f) !== 'LoreForge_Execution_Packet/SHA256SUMS.txt',
  )
  const corpus = corpusFiles.map((f) => read(f)).join('\n')
  for (const [, id, , owning] of rows) {
    assert.ok(owning.trim().length > 0, `${id} has a nonempty owning ticket/path`)
    assert.ok(!/^"?later"?$/i.test(owning.trim()), `${id} owner is not merely "later"`)
    assert.ok(corpus.includes(id), `${id} is referenced in its owning ticket/path outside the register`)
  }
  // The P05R-T00 seeded rows explicitly named by P05R-T07 must be present.
  for (const id of ['DEF-SEARCH-02', 'DEF-SHELL-01', 'DEF-CHAR-01']) {
    assert.ok(register.includes(`| ${id} |`), `${id} row present`)
  }
})
