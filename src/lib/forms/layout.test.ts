import test from 'node:test'
import assert from 'node:assert/strict'

import { assertFormSchema } from './schema'
import { autoBodyTemplate, autoTitleTemplate, displayAnswersForRender, headingText, recordNameKeyFromTitle, slugifyLabel, slugifyOptionValue, tokensMatchFields, uniqueKey } from './layout'
import { renderNeutralTemplate } from './generateDocument'
import { escapeMarkdownValue, renderTemplateTokens } from '@/lib/templates/compose'

test('P06R slugifyLabel produces stable lowercase keys with a leading letter', () => {
  assert.equal(slugifyLabel('Incident date'), 'incident_date')
  assert.equal(slugifyLabel('  What Happened?  '), 'what_happened')
  assert.equal(slugifyLabel('Date'), 'date')
  assert.equal(slugifyLabel('2nd Floor'), 'f_2nd_floor')
  assert.equal(slugifyLabel('Hôtel Ar'), 'hotel_ar')
  assert.equal(slugifyLabel('!!!'), '')
})

test('P06R uniqueKey keeps existing keys and de-duplicates deterministically', () => {
  const taken = new Set(['date'])
  assert.equal(uniqueKey('date', taken), 'date_2')
  assert.equal(uniqueKey('date', new Set(['date', 'date_2', 'date_3'])), 'date_4')
  assert.equal(uniqueKey('', taken), 'field')
  assert.equal(uniqueKey('incident', new Set(['incident'])), 'incident_2')
  // A suffix already inside the base is preserved; only the suffix counter
  // grows, so re-saving identical labels stays stable forever.
  assert.equal(uniqueKey('date_2', new Set(['date_2', 'date_3'])), 'date_2_2')
})

test('P06R slugifyOptionValue never returns an empty value', () => {
  assert.equal(slugifyOptionValue('Minor damage'), 'minor_damage')
  assert.equal(slugifyOptionValue('!!!'), 'option')
})

test('P06R record name falls back through candidates when the pinned source is gone', () => {
  const fields = [
    { key: 'checked', type: 'checkbox' as const, label: 'Consent' },
    { key: 'what_happened', type: 'textarea' as const, label: 'What happened?' },
    { key: 'when', type: 'date' as const, label: 'When' },
  ]
  // Pinned source (first field) is not naming-capable -> first candidate.
  assert.equal(autoTitleTemplate(fields, 'checked'), '{{what_happened}}')
  assert.equal(autoTitleTemplate(fields, 'missing_key'), '{{what_happened}}')
  assert.equal(autoTitleTemplate(fields, 'when'), '{{when}}')
  // Only non-naming questions -> null (caller falls back to the form name).
  assert.equal(autoTitleTemplate([{ key: 'checked', type: 'checkbox' as const, label: 'Consent' }, { key: 'witness', type: 'character' as const, label: 'Witness' }], null), null)
})

test('P06R auto body has one section per question and no reserved content token', () => {
  const fields = [
    { key: 'what_happened', type: 'textarea' as const, label: 'What happened?' },
    { key: 'kind', type: 'select' as const, label: 'Kind' },
  ]
  const body = autoBodyTemplate(fields)
  assert.equal(body, '## What happened?\n\n{{what_happened}}\n\n## Kind\n\n{{kind}}')
  assert.ok(!body.includes('{{content}}'))
  assert.ok(tokensMatchFields('{{what_happened}}', body, fields))
  // Reserved content token and undeclared tokens are rejected whenever present.
  assert.ok(!tokensMatchFields('{{what_happened}}', `${body}\n\n{{content}}`, fields))
  assert.ok(!tokensMatchFields('{{what_happened}}', `${body}\n\n{{nope}}`, fields))
  const onlyKind = [{ key: 'kind', type: 'select' as const, label: 'Kind' }]
  assert.ok(!tokensMatchFields('{{what_happened}}', autoBodyTemplate(onlyKind), onlyKind))
})

test('P06R headings neutralize braces so labels cannot inject tokens', () => {
  const adversarial = [{ key: 'amount', type: 'text' as const, label: 'Cost {{total}} of {{content}}' }]
  const body = autoBodyTemplate(adversarial)
  assert.equal(headingText('Cost {{total}} of {{content}}'), 'Cost {total} of {content}')
  assert.ok(!body.includes('{{total}}') && !body.includes('{{content}}'))
  const tokens = [...body.matchAll(/\{\{\s*([\w-]+)\s*\}\}/g)].map((match) => match[1])
  assert.deepEqual(tokens, ['amount'])
})

test('P06R auto-composed templates render through the neutral seam', () => {
  const schema = assertFormSchema({
    version: 1,
    fields: [
      { key: 'when', type: 'date', label: 'When', required: true },
      { key: 'kind', type: 'select', label: 'Kind of incident', options: [{ label: 'Minor damage', value: 'minor_damage' }] },
      { key: 'consented', type: 'checkbox', label: 'Owner notified' },
    ],
  })
  const title = autoTitleTemplate(schema.fields, null) ?? 'Incident Report'
  const body = autoBodyTemplate(schema.fields)
  assert.equal(title, '{{when}}')
  // The action layer maps stored values to display answers before rendering.
  const renderAnswers = displayAnswersForRender(schema, { when: '2026-09-04', kind: 'minor_damage', consented: true })
  const rendered = renderNeutralTemplate({ id: 1, name: 'Incident', kind: 'form', titleTemplate: title, bodyTemplate: body, formSchema: schema }, renderAnswers)
  assert.equal(rendered.title, '2026-09-04')
  assert.ok(rendered.body.includes('## Kind of incident'))
  assert.ok(rendered.body.includes('Minor damage'))
  assert.ok(rendered.body.includes('Yes'))
})

test('P06R recordNameKeyFromTitle infers a single naming token or null', () => {
  const fields = [
    { key: 'kind', type: 'select' as const, label: 'Kind' },
    { key: 'when', type: 'date' as const, label: 'When' },
    { key: 'witness', type: 'character' as const, label: 'Witness' },
  ]
  assert.equal(recordNameKeyFromTitle('{{kind}} - {{when}}', fields), null) // compound -> not inferable
  assert.equal(recordNameKeyFromTitle('{{when}}', fields), 'when')
  assert.equal(recordNameKeyFromTitle('{{witness}}', fields), null) // character can't name records
  assert.equal(recordNameKeyFromTitle('General Report', fields), null)
})

test('P06R display mapping renders select labels and normalizes checkboxes', () => {
  const schema = assertFormSchema({
    version: 1,
    fields: [
      { key: 'kind', type: 'select', label: 'Kind', options: [{ label: 'Minor damage', value: 'minor_damage' }] },
      { key: 'consented', type: 'checkbox', label: 'Owner notified' },
      { key: 'date', type: 'date', label: 'Date' },
    ],
  })
  const display = displayAnswersForRender(schema, { kind: 'minor_damage', consented: 'true', date: '' })
  assert.deepEqual(display, { kind: 'Minor damage', consented: true, date: '' })
  const displayFalse = displayAnswersForRender(schema, { kind: 'other', consented: false })
  assert.equal(displayFalse.consented, false)
  assert.equal(displayFalse.kind, 'other') // unknown values stay visible, not blank
})

test('P06R markdown escaping matches neutral composition expectations', () => {
  // Guard against drift between this module's rendering expectations and the
  // existing token renderer used by every generation path.
  assert.equal(escapeMarkdownValue(true), 'Yes')
  assert.equal(renderTemplateTokens('{{x}}', { x: 'true' }, { version: 1 as const, fields: [{ key: 'x', type: 'text' as const, label: 'X' }] }), 'true')
})
