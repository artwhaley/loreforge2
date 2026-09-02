import assert from 'node:assert/strict'
import test from 'node:test'

import { canonicalizeMarkdown } from '../../lib/markdown/canonical'
import { renderMarkdown } from '../../lib/markdown/render'

// The fixture exercises every control intentionally exposed by the editor.
// Source mode is verbatim, while the save boundary canonicalizes newlines.
const EDITOR_ROUND_TRIP_FIXTURE = [
  '# Heading',
  '',
  '**Bold** and *italic* with [a link](https://example.test/archive).',
  '',
  '> A blockquote',
  '',
  '1. Ordered item',
  '   - Nested item',
  '',
  '| Field | Value |',
  '| --- | --- |',
  '| status | open |',
  '',
  '---',
  '',
  'Final paragraph.',
].join('\n')

test('editor fixture round-trips through the canonical source boundary', () => {
  let source = EDITOR_ROUND_TRIP_FIXTURE.replace(/\n/g, '\r\n')
  for (let cycle = 0; cycle < 3; cycle += 1) {
    source = canonicalizeMarkdown(source)
    assert.equal(source.includes('\r'), false)
    assert.match(source, /# Heading/)
    assert.match(source, /1\. Ordered item\n   - Nested item/)
    assert.match(source, /\| Field \| Value \|\n\| --- \| --- \|/)
    assert.match(source, /> A blockquote/)
    assert.match(source, /---/)
  }
})

test('editor fixture renders all supported structures without an alternate path', () => {
  const html = renderMarkdown(EDITOR_ROUND_TRIP_FIXTURE)
  assert.match(html, /<h1>Heading<\/h1>/)
  assert.match(html, /<strong>Bold<\/strong>/)
  assert.match(html, /<em>italic<\/em>/)
  assert.match(html, /<blockquote>/)
  assert.match(html, /<ol>/)
  assert.match(html, /<ul>/)
  assert.match(html, /<table>/)
  assert.match(html, /<hr(?: \/)?>/)
})
