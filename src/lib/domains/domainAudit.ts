import type { Payload } from 'payload'

/**
 * P05R-T05 B: the one durable administrative audit seam for Domain-level
 * authorization truth (memberships, Roles, RoleAssignments, direct Folder
 * access, PermissionRules). Append-only; context is generated server-side by
 * the caller, never client-supplied. This is the audit log for administration
 * — Document history lives in the separate document-provenance store.
 */
export const DOMAIN_AUDIT_EVENT_TYPES = [
  'membership_changed',
  'role_changed',
  'role_assignment_changed',
  'folder_access_changed',
  'permission_rule_changed',
] as const

export type DomainAuditEventType = (typeof DOMAIN_AUDIT_EVENT_TYPES)[number]

export const DOMAIN_AUDIT_EVENT_LABELS: Record<DomainAuditEventType, string> = {
  membership_changed: 'Domain membership changed',
  role_changed: 'Role changed',
  role_assignment_changed: 'Role assignment changed',
  folder_access_changed: 'Direct Folder access changed',
  permission_rule_changed: 'Permission rule changed',
}

export type DomainAuditContext = Record<string, unknown>

export type DomainAuditInput = {
  /** Omit to lazily resolve the configured Payload instance. */
  payload?: Payload
  domainId: number | string
  eventType: DomainAuditEventType
  actorUser?: number | string | null
  actorCharacter?: number | string | null
  targetType: string
  targetId: number | string
  action: string
  context?: DomainAuditContext
  /** Join an explicit DB transaction started by the caller (P05R-T02 pattern). */
  transactionID?: number | string | null
}

/** The sole application writer for Domain administrative audit events. */
export async function recordDomainAudit(input: DomainAuditInput): Promise<{ id: number | string }> {
  const payload = input.payload ?? (await (await import('@/lib/payload')).getLorePayload())
  const req = input.transactionID == null ? undefined : { transactionID: input.transactionID }
  return payload.create({
    collection: 'domain-audit-events',
    overrideAccess: true,
    depth: 0,
    req,
    data: {
      domain: Number(input.domainId),
      eventType: input.eventType,
      actorUser: input.actorUser == null ? undefined : Number(input.actorUser),
      actorCharacter: input.actorCharacter == null ? undefined : Number(input.actorCharacter),
      targetType: input.targetType,
      targetId: String(input.targetId),
      action: input.action,
      occurredAt: new Date().toISOString(),
      context: input.context,
    },
  } as never) as unknown as { id: number | string }
}