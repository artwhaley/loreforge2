/**
 * The frozen capability vocabulary — single source of truth (P05R-T04 C).
 *
 * Copied exactly from the Architecture Contract (03_ARCHITECTURE_CONTRACT.md,
 * "Stable capabilities include:", CC-frozen). The schema options, the
 * PermissionRules validation hook, and future evaluator code must all consume
 * this list; nothing may drift from it.
 *
 * Note vs. the P05R-T04 draft: the draft claimed the contract froze 23
 * capabilities without `manage_access`. Verified against the packet: the
 * frozen list is 24 and INCLUDES `manage_access` (it is load-bearing for the
 * contract's authorization-precedence and Share rules), and the current schema
 * already ships 7 of the 24. The 17 additions below complete the vocabulary;
 * `share_document` is reserved vocabulary with no customer workflow before the
 * owner decision (CC-2026-09-03-04). `move_document` / `copy_document` are
 * rejected product concepts and must never appear.
 */
export const CAPABILITIES = [
  'read',
  'create_document',
  'edit_document',
  'submit_document',
  'file_document',
  'approve_document',
  'lock_document',
  'unlock_document',
  'delete_document',
  'restore_document',
  'share_document',
  'export_document',
  'manage_folders',
  'manage_templates',
  'manage_types_tags',
  'manage_access',
  'manage_members',
  'manage_claims',
  'manage_roles',
  'assign_roles',
  'assign_subordinates',
  'manage_subdomain',
  'manage_domain_appearance',
  'manage_notices',
] as const

export type Capability = (typeof CAPABILITIES)[number]

export const CAPABILITY_LABELS: Record<Capability, string> = {
  read: 'Read',
  create_document: 'Create documents',
  edit_document: 'Edit documents',
  submit_document: 'Submit documents',
  file_document: 'File documents',
  approve_document: 'Approve documents',
  lock_document: 'Lock documents',
  unlock_document: 'Unlock documents',
  delete_document: 'Delete documents',
  restore_document: 'Restore documents',
  share_document: 'Share documents',
  export_document: 'Export documents',
  manage_folders: 'Manage folders',
  manage_templates: 'Manage templates',
  manage_types_tags: 'Manage types and tags',
  manage_access: 'Manage access',
  manage_members: 'Manage members',
  manage_claims: 'Manage claims',
  manage_roles: 'Manage roles',
  assign_roles: 'Assign roles',
  assign_subordinates: 'Assign subordinates',
  manage_subdomain: 'Manage departments',
  manage_domain_appearance: 'Manage Domain appearance',
  manage_notices: 'Manage notices',
}

export function isCapability(value: string): value is Capability {
  return (CAPABILITIES as readonly string[]).includes(value)
}

/** Frozen Contract PermissionRule principal/resource type vocabularies. */
export const PRINCIPAL_TYPES = ['Character', 'User', 'Role', 'DomainMembership'] as const
export type PrincipalType = (typeof PRINCIPAL_TYPES)[number]
export const RESOURCE_TYPES = ['Domain', 'Subdomain', 'Folder', 'Document'] as const
export type ResourceType = (typeof RESOURCE_TYPES)[number]