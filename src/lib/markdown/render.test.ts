import assert from 'node:assert/strict'
import test from 'node:test'

import { canonicalizeMarkdown } from './canonical'
import { renderMarkdown } from './render'

test('renders the supported Markdown dialect with safe links and tables', () => {
  const html = renderMarkdown(
    '# Archive\n\n**Bold** and *italic*\n\n| Name | Value |\n| --- | --- |\n| deed | 1 |\n\n[Open](https://example.test/archive) or [email](mailto:clerk@example.test)',
  )

  assert.match(html, /<h1>Archive<\/h1>/)
  assert.match(html, /<strong>Bold<\/strong>/)
  assert.match(html, /<table>/)
  assert.match(html, /href="https:\/\/example\.test\/archive"/)
  assert.match(html, /href="mailto:clerk@example\.test"/)
})

test('escapes raw HTML and removes dangerous markup and attributes', () => {
  const html = renderMarkdown(
    '<script>alert(1)</script>\n\n<img src=x onerror="alert(2)">\n\n<div onclick="alert(3)">text</div>\n\n![x](data:image/svg+xml,<svg/onload=alert(4)>)',
  )

  assert.doesNotMatch(html, /<(?:script|img|div)\b|<[^>]*(?:onerror|onclick|onload)\s*=/i)
  assert.doesNotMatch(html, /javascript:|vbscript:|data:/i)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
})

test('rejects encoded, obfuscated, and protocol-relative dangerous links', () => {
  const html = renderMarkdown(
    '[one](javascript:alert(1)) [two](JaVaScRiPt%3Aalert(2)) [three](java&#115;cript:alert(3)) [four](//evil.test/x) [five](vbscript:alert(4)) [six](data:text/html,evil)',
  )

  assert.doesNotMatch(html, /href\s*=\s*['"][^'"]*(?:javascript|vbscript|data:|\/\/evil)/i)
})

test('keeps benign angle-bracket prose visible and canonicalization unchanged', () => {
  const html = renderMarkdown('A < B and C > D\r\n\r\nNext line')

  assert.match(html, /A &lt; B and C &gt; D/)
  assert.equal(canonicalizeMarkdown('one\r\ntwo\rthree'), 'one\ntwo\nthree')
})
