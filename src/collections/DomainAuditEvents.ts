import type { CollectionConfig } from 'payload'

import { DOMAIN_AUDIT_EVENT_LABELS, DOMAIN_AUDIT_EVENT_TYPES } from '@/lib/domains/domainAudit'

/**
 * P05R-T05 B: append-only administrative audit log for Domain-level
 * authorization truth (memberships, Roles, RoleAssignments, direct Folder
 * access, PermissionRules). Mirrors the DocumentProvenanceEvents access
 * pattern: no ordinary customer read/create/update/delete; writes happen only
 * through the recordDomainAudit service seam with overrideAccess. Context is
 * server-generated structured JSON — never client-supplied. This is an audit
 * log, not a metadata framework.
 */
export const DomainAuditEvents: CollectionConfig = {
  slug: 'domain-audit-events',
  admin: {
    useAsTitle: 'eventType',
    hidden: true,
    defaultColumns: ['domain', 'eventType', 'actorUser', 'targetType', 'occurredAt'],
  },
  timestamps: true,
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  indexes: [{ fields: ['domain', 'targetType', 'targetId'] }],
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true },
    {
      name: 'eventType',
      type: 'select',
      required: true,
      index: true,
      options: DOMAIN_AUDIT_EVENT_TYPES.map((value) => ({ label: DOMAIN_AUDIT_EVENT_LABELS[value], value })),
    },
    { name: 'actorUser', type: 'relationship', relationTo: 'users', required: false, index: true },
    { name: 'actorCharacter', type: 'relationship', relationTo: 'characters', required: false, index: true },
    { name: 'targetType', type: 'text', required: true, index: true, admin: { description: 'Stable target kind, e.g. role, role-assignment, folder, membership.' } },
    { name: 'targetId', type: 'text', required: true, index: true, admin: { description: 'Stable target row id (or composite key) the event concerns.' } },
    { name: 'action', type: 'text', required: true, admin: { description: 'Short verb, e.g. added, deactivated, assigned, archived.' } },
    { name: 'occurredAt', type: 'date', required: true, index: true, defaultValue: () => new Date().toISOString() },
    { name: 'context', type: 'json', required: false, admin: { description: 'Server-generated structured change context; never client-supplied.' } },
  ],
}