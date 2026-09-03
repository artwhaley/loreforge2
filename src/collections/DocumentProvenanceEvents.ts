import type { CollectionConfig } from 'payload'

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
      options: [
        { label: 'Created', value: 'created' }, { label: 'Edited', value: 'edited' },
        { label: 'Submitted for review', value: 'submitted' }, { label: 'Filed', value: 'filed' },
        { label: 'Approved', value: 'approved' }, { label: 'Rejected', value: 'rejected' },
        { label: 'Locked', value: 'locked' }, { label: 'Unlocked', value: 'unlocked' },
        { label: 'Moved', value: 'moved' }, { label: 'Copied', value: 'copied' },
        { label: 'Shared', value: 'shared' }, { label: 'Relationship added', value: 'relationship-added' },
        { label: 'Relationship removed', value: 'relationship-removed' }, { label: 'Deleted', value: 'deleted' },
        { label: 'Restored', value: 'restored' }, { label: 'Copied from', value: 'copied_from' },
        { label: 'Copied to', value: 'copied_to' }, { label: 'Share revoked', value: 'share_revoked' },
        { label: 'Relationship added (canonical)', value: 'relationship_added' }, { label: 'Relationship removed (canonical)', value: 'relationship_removed' },
        { label: 'Character link changed', value: 'character_link_changed' }, { label: 'Tag changed', value: 'tag_changed' },
        { label: 'Superseded', value: 'superseded' }, { label: 'Withdrawn', value: 'withdrawn' }, { label: 'Soft-deleted', value: 'soft_deleted' },
      ],
    },
    { name: 'occurredAt', type: 'date', required: true, index: true, defaultValue: () => new Date().toISOString() },
    { name: 'context', type: 'json', required: false, admin: { description: 'Structured before/after or workflow context.' } },
    { name: 'revisionId', type: 'text', required: false, admin: { description: 'Payload revision ID, when available.' } },
    { name: 'sourceDescriptor', type: 'text', required: false, admin: { description: 'External source identity, such as a future bridge event.' } },
  ],
}
