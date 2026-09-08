/**
 * Shared operational-surface descriptors (OBSIDIAN-T01).
 *
 * Page Models for Domain-local operational pages contain safe facts and
 * capabilities, never UI layout (no pixel sizes, modal state, sort mode,
 * selection, or icon names). Builders are request-scoped and reuse the
 * existing cached authorization sessions; Designs never query Payload.
 */

/** Route-level status/error descriptor when a surface needs one. */
export type ManagementStatusDescriptor = {
  level: 'info' | 'error'
  message: string
} | null

/** Capability-safe domain/base facts shared by operational models. */
export type ManagementRouteFacts = {
  baseUrl: string
  domainSlug: string
  domainName: string
  /** Numeric Domain id — needed by action forms that post to API routes. */
  domainId: number
}