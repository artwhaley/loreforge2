import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { renderTemplate } from './generateDocument'

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
})
