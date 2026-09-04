import type { CollectionConfig } from 'payload'

import { PROVENANCE_EVENT_TYPES, type ProvenanceEventType } from '@/lib/documents/provenance'

const EVENT_LABELS: Record<ProvenanceEventType, string> = {
  created: 'Created', edited: 'Edited', submitted: 'Submitted for review', withdrawn: 'Withdrawn',
  approved: 'Approved', rejected: 'Rejected', filed: 'Filed', locked: 'Locked', unlocked: 'Unlocked',
  soft_deleted: 'Soft-deleted', restored: 'Restored', shared: 'Shared', share_revoked: 'Share revoked',
  relationship_added: 'Relationship added', relationship_removed: 'Relationship removed', superseded: 'Superseded',
  tag_changed: 'Tag changed', character_link_changed: 'Character link changed',
  imported: 'Imported', exported: 'Exported', sl_transfer: 'Second Life transfer',
}

/** Append-only, Document-owned history. */
export const DocumentProvenanceEvents: CollectionConfig = {
  slug: 'document-provenance-events',
  admin: {
    useAsTitle: 'eventType',
    hidden: true,
    defaultColumns: ['document', 'eventType', 'actorUser', 'actorCharacter', 'occurredAt'],
  },
  timestamps: true,
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true },
    { name: 'document', type: 'relationship', relationTo: 'documents', required: true, index: true },
    { name: 'actorUser', type: 'relationship', relationTo: 'users', required: false, index: true },
    { name: 'actorCharacter', type: 'relationship', relationTo: 'characters', required: false, index: true },
    {
      name: 'eventType',
      type: 'select',
      required: true,
      index: true,
      // P05R-T04 G: exactly the Architecture Contract's minimum event list
      // (imported/exported/sl_transfer/withdrawn added; moved/copied*/deleted
      // and the kebab spellings pruned after a stored-row check showed zero
      // rows used them; shared/share_revoked reserved but unused).
      options: PROVENANCE_EVENT_TYPES.map((value) => ({ label: EVENT_LABELS[value], value })),
    },
    { name: 'occurredAt', type: 'date', required: true, index: true, defaultValue: () => new Date().toISOString() },
    { name: 'context', type: 'json', required: false, admin: { description: 'Structured before/after or workflow context.' } },
    { name: 'revisionId', type: 'text', required: false, admin: { description: 'Payload revision ID, when available.' } },
    { name: 'sourceDescriptor', type: 'text', required: false, admin: { description: 'External source identity, such as a future bridge event.' } },
  ],
}
