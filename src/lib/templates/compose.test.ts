import test from 'node:test'
import assert from 'node:assert/strict'

import { composeTemplate, escapeMarkdownValue, renderTemplateTokens } from './compose'

test('P06-T01 composition replaces the one reserved content token deterministically', () => {
  const base = { id: 1, titleTemplate: 'Letter', bodyTemplate: '# Header\n\n{{content}}\n\n— Ar' as const }
  const child = { id: 2, titleTemplate: '{{kind}}', bodyTemplate: 'Body for {{kind}}', baseTemplate: base as never, kind: 'form' as const, formSchema: { version: 1, fields: [{ key: 'kind', type: 'text', label: 'Kind' }] } }
  const composed = composeTemplate(child, () => base)
  assert.equal(composed.bodyTemplate, '# Header\n\nBody for {{kind}}\n\n— Ar')
  assert.deepEqual(composed.chain, [2, 1])
})

test('P06-T01 rejects a base without exactly one content insertion point', () => {
  const child = { id: 2, titleTemplate: 'Child', bodyTemplate: 'body', baseTemplate: 1 }
  assert.throws(() => composeTemplate(child, () => ({ id: 1, titleTemplate: 'Base', bodyTemplate: 'no insertion' })), /exactly one/)
})

test('P06-T02 renders validated tokens and escapes Markdown structure', () => {
  const schema = { version: 1 as const, fields: [{ key: 'name', type: 'text' as const, label: 'Name' }] }
  assert.equal(renderTemplateTokens('Hello {{name}}', { name: '*Tarl*' }, schema), 'Hello \\*Tarl\\*')
  assert.throws(() => renderTemplateTokens('{{missing}}', {}, schema), /Unknown template token/)
  assert.equal(escapeMarkdownValue(true), 'Yes')
})

