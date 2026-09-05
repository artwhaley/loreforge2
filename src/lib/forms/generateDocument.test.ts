import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { composeFormSections, renderNeutralTemplate, renderTemplate } from './generateDocument'

describe('renderTemplate (form -> document generation seam)', () => {
  it('renders the fixture title template from fixture answers', () => {
    const out = renderTemplate('{{incident_type}} Report - {{incident_date}}', {
      incident_type: 'Property Damage',
      incident_date: '2026-09-01',
    })
    assert.equal(out, 'Property Damage Report - 2026-09-01')
  })

  it('renders the fixture markdown template with blank-line structure intact', () => {
    const template = [
      '# {{incident_type}} Report',
      '',
      '**Date:** {{incident_date}}  ',
      '**Reporting Officer:** {{officer_name}}  ',
      '**Location:** {{location}}',
      '',
      '## Narrative',
      '',
      '{{narrative}}',
    ].join('\n')
    const out = renderTemplate(template, {
      incident_type: 'Property Damage',
      incident_date: '2026-09-01',
      officer_name: 'Alex Mercer',
      location: '118 Market Street',
      narrative: 'Responded to a report of a damaged storefront window.',
    })
    assert.ok(out.startsWith('# Property Damage Report\n\n**Date:** 2026-09-01'))
    assert.ok(out.includes('**Reporting Officer:** Alex Mercer'))
    assert.ok(out.includes('## Narrative\n\nResponded to a report'))
  })

  it('renders unchecked/missing answers as empty text, not "undefined"', () => {
    const out = renderTemplate('Follow-up: {{follow_up_required}} / {{persons_involved}}!', {
      follow_up_required: false,
      persons_involved: undefined,
    })
    assert.equal(out, 'Follow-up: false / !')
  })

  it('tolerates whitespace inside placeholders', () => {
    const out = renderTemplate('{{ location }}', { location: '118 Market Street' })
    assert.equal(out, '118 Market Street')
  })

  it('leaves unknown placeholders empty without throwing', () => {
    const out = renderTemplate('Hello {{no_such_field}}', {})
    assert.equal(out, 'Hello ')
  })

  it('strict neutral rendering rejects unknown tokens and escapes Markdown values', () => {
    const template = { id: 1, name: 'Incident', kind: 'form' as const, titleTemplate: '{{title}}', bodyTemplate: '{{title}}', formSchema: { version: 1 as const, fields: [{ key: 'title', type: 'text' as const, label: 'Title' }] } }
    assert.equal(renderNeutralTemplate(template, { title: '*unsafe*' }).body, '\\*unsafe\\*')
    assert.throws(() => renderNeutralTemplate({ ...template, bodyTemplate: '{{missing}}' }, { title: 'ok' }), /Unknown template token/)
  })

  it('composes fixed Form header and footer around the generated body', () => {
    assert.equal(composeFormSections('## Header\r\n\r\nPrepared', '## Answers\n\nBody', '— Footer'), '## Header\n\nPrepared\n\n## Answers\n\nBody\n\n— Footer')
    assert.equal(composeFormSections('', '## Answers\n\nBody', ''), '## Answers\n\nBody')
    const rendered = renderNeutralTemplate({ id: 2, name: 'Incident', kind: 'form', titleTemplate: 'Incident', bodyTemplate: '## Answers\n\n{{answer}}', headerMarkdown: '# Header', footerMarkdown: '— Footer', formSchema: { version: 1, fields: [{ key: 'answer', type: 'text', label: 'Answer' }] } }, { answer: 'Body' })
    assert.equal(rendered.body, '# Header\n\n## Answers\n\nBody\n\n— Footer')
  })
})
