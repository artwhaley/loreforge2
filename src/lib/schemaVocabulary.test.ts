/**
 * P05R-T04 schema-vocabulary pins. Importing the collection configs is
 * side-effect free (no Payload init), so this is a pure test:
 * - PermissionRules.capability options == CAPABILITIES == frozen contract list
 *   (24, including manage_access; no move_/copy_ ghosts);
 * - DocumentProvenanceEvents options == contract minimum event list (21,
 *   including reserved shared/share_revoked; no moved, copied, or kebab
 *   spellings);
 * - Documents.sourceKind == canonical set without `copy`;
 * - Documents.folder is required; Folders.publicAccess defaults to inherit.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { CAPABILITIES } from '@/lib/permissions/capabilities'
import { PROVENANCE_EVENT_TYPES } from '@/lib/documents/provenance'
import { PermissionRules } from '@/collections/PermissionRules'
import { DocumentProvenanceEvents } from '@/collections/DocumentProvenanceEvents'
import { Documents } from '@/collections/Documents'
import { Folders } from '@/collections/Folders'

const optionValues = (collection: { fields: unknown[] }, fieldName: string) => {
  const field = (collection.fields as Array<{ name?: string; options?: Array<{ value: string }> }>).find((item) => item.name === fieldName)
  assert.ok(field, `${fieldName} field exists`)
  return (field?.options ?? []).map((option) => option.value)
}

test('P05R-T04 C: PermissionRules.capability options equal the frozen contract list exactly', () => {
  const expected = [
    'read', 'create_document', 'edit_document', 'submit_document', 'file_document',
    'approve_document', 'lock_document', 'unlock_document', 'delete_document',
    'restore_document', 'share_document', 'export_document', 'manage_folders',
    'manage_templates', 'manage_types_tags', 'manage_access', 'manage_members',
    'manage_claims', 'manage_roles', 'assign_roles', 'assign_subordinates',
    'manage_subdomain', 'manage_domain_appearance', 'manage_notices',
  ]
  assert.equal(CAPABILITIES.length, 24)
  assert.deepEqual([...CAPABILITIES], expected)
  assert.deepEqual(optionValues(PermissionRules, 'capability'), expected, 'schema options == shared constant')
  assert.ok(expected.includes('manage_access'), 'manage_access is in the frozen contract list')
  assert.ok(!expected.includes('move_document') && !expected.includes('copy_document'), 'Copy/Move remain rejected concepts')
})

test('P05R-T04 G: provenance options equal the contract minimum event list exactly', () => {
  const expected = [
    'created', 'edited', 'submitted', 'withdrawn', 'approved', 'rejected',
    'filed', 'locked', 'unlocked', 'soft_deleted', 'restored', 'shared',
    'share_revoked', 'relationship_added', 'relationship_removed', 'superseded',
    'tag_changed', 'character_link_changed', 'imported', 'exported', 'sl_transfer',
  ]
  assert.equal(PROVENANCE_EVENT_TYPES.length, 21)
  assert.deepEqual([...PROVENANCE_EVENT_TYPES], expected)
  assert.deepEqual(optionValues(DocumentProvenanceEvents, 'eventType'), expected, 'schema options == shared constant')
  for (const ghost of ['moved', 'copied', 'copied_from', 'copied_to', 'deleted', 'relationship-added', 'relationship-removed']) {
    assert.ok(!expected.includes(ghost), `${ghost} must be pruned`)
  }
})

test('P05R-T04 H: sourceKind is the canonical set without copy', () => {
  assert.deepEqual(optionValues(Documents, 'sourceKind'), ['web', 'markdown-import', 'form', 'correspondence', 'second-life'])
})

test('P05R-T04 A/B: Documents.folder is required and Folders.publicAccess defaults to inherit', () => {
  const documentFields = Documents.fields as Array<{ name?: string; required?: boolean }>
  const folderField = documentFields.find((field) => field.name === 'folder')
  assert.equal(folderField?.required, true, 'folder is genuinely required in the schema')
  const folderFields = Folders.fields as Array<{ name?: string; defaultValue?: string; options?: Array<{ value: string }> }>
  const publicAccess = folderFields.find((field) => field.name === 'publicAccess')
  assert.equal(publicAccess?.defaultValue, 'inherit')
  assert.deepEqual(publicAccess?.options?.map((option) => option.value), ['inherit', 'private', 'public'])
})