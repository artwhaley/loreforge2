import { describe, expect, it } from 'vitest'

import {
  DEPRECATED_DOCUMENT_MODEL,
  DRAFT_DOCUMENT_MODEL,
  FILED_DOCUMENT_MODEL,
  LOCKED_DOCUMENT_MODEL,
  SOURCE_DOCUMENT_MODEL,
  SUBMITTED_DOCUMENT_MODEL,
  SUCCESSOR_DOCUMENT_MODEL,
  SUPERSEDED_DOCUMENT_MODEL,
} from '@/lib/design/fixtures'
import { getDocumentActions, type DocumentActionKey } from '@/lib/documents/presentation/actions'

const keys = (model: Parameters<typeof getDocumentActions>[0], bridges: Parameters<typeof getDocumentActions>[1] = {}) =>
  getDocumentActions(model, bridges).map((action) => action.operation)

/**
 * P08D-T02 shared Document action semantics. Presence AND absence across every
 * lifecycle state; bridges gate only the form actions (submit/file/approve/
 * deprecate/restore/lock/unlock/delete), never the link actions.
 */
describe('getDocumentActions across lifecycle states', () => {
  it('Draft: editable, submittable, fileable, lockable, deletable — never superseded or approved', () => {
    const expected: DocumentActionKey[] = ['edit', 'history', 'submit', 'file', 'lock', 'delete']
    expect(keys(DRAFT_DOCUMENT_MODEL, { workflow: true, delete: true })).toEqual(expected)
    for (const absent of ['approve', 'deprecate', 'restore', 'unlock', 'supersede']) {
      expect(keys(DRAFT_DOCUMENT_MODEL, { workflow: true, delete: true })).not.toContain(absent)
    }
  })

  it('Submitted: approve only', () => {
    expect(keys(SUBMITTED_DOCUMENT_MODEL, { workflow: true, delete: true })).toEqual(['history', 'approve'])
  })

  it('Filed: edit, deprecate, lock, supersede, delete', () => {
    expect(keys(FILED_DOCUMENT_MODEL, { workflow: true, delete: true })).toEqual(['edit', 'history', 'supersede', 'deprecate', 'lock', 'delete'])
    for (const absent of ['submit', 'file', 'approve', 'restore', 'unlock']) {
      expect(keys(FILED_DOCUMENT_MODEL, { workflow: true, delete: true })).not.toContain(absent)
    }
  })

  it('Deprecated: restore and supersede', () => {
    expect(keys(DEPRECATED_DOCUMENT_MODEL, { workflow: true, delete: true })).toEqual(['history', 'supersede', 'restore'])
  })

  it('Locked: unlock only — no edit, no lock, no supersede, no delete', () => {
    expect(keys(LOCKED_DOCUMENT_MODEL, { workflow: true, delete: true })).toEqual(['history', 'unlock'])
  })

  it('Superseded: no creation actions at all', () => {
    expect(keys(SUPERSEDED_DOCUMENT_MODEL, { workflow: true, delete: true })).toEqual(['history'])
    for (const absent of ['edit', 'submit', 'file', 'approve', 'deprecate', 'restore', 'lock', 'unlock', 'supersede', 'delete']) {
      expect(keys(SUPERSEDED_DOCUMENT_MODEL, { workflow: true, delete: true })).not.toContain(absent)
    }
  })

  it('carries the successor/source states without losing the permitted surface', () => {
    // A Filed record with a predecessor keeps the full Filed action set.
    expect(keys(SUCCESSOR_DOCUMENT_MODEL, { workflow: true, delete: true })).toEqual(['edit', 'history', 'supersede', 'deprecate', 'lock', 'delete'])
    // Raw-source viewing is orthogonal to the action surface.
    expect(keys(SOURCE_DOCUMENT_MODEL, { workflow: true, delete: true })).toEqual(['edit', 'history', 'supersede', 'deprecate', 'lock', 'delete'])
  })

  it('without bridges, only link actions are offered (server/preview posture)', () => {
    expect(keys(FILED_DOCUMENT_MODEL)).toEqual(['edit', 'history', 'supersede'])
    expect(keys(DRAFT_DOCUMENT_MODEL)).toEqual(['edit', 'history'])
    expect(keys(SUPERSEDED_DOCUMENT_MODEL)).toEqual(['history'])
  })

  it('workflow bridge alone does not enable deletion; delete bridge alone does not enable lifecycle actions', () => {
    expect(keys(FILED_DOCUMENT_MODEL, { workflow: true })).toEqual(['edit', 'history', 'supersede', 'deprecate', 'lock'])
    expect(keys(FILED_DOCUMENT_MODEL, { delete: true })).toEqual(['edit', 'history', 'supersede', 'delete'])
  })

  it('labels match the shared defaults and hrefs point at the canonical targets', () => {
    const actions = getDocumentActions(FILED_DOCUMENT_MODEL, { workflow: true, delete: true })
    const edit = actions.find((action) => action.operation === 'edit')
    expect(edit?.label).toBe('Edit')
    expect(edit?.href).toBe(FILED_DOCUMENT_MODEL.routes.editUrl)
    const supersede = actions.find((action) => action.operation === 'supersede')
    expect(supersede?.href).toBe(FILED_DOCUMENT_MODEL.routes.supersedeUrl)
    const deprecate = actions.find((action) => action.operation === 'deprecate')
    expect(deprecate?.label).toBe('Deprecate')
    expect(deprecate?.href).toBeNull()
    const del = actions.find((action) => action.operation === 'delete')
    expect(del?.label).toBe('Delete')
    expect(del?.href).toBeNull()
  })
})