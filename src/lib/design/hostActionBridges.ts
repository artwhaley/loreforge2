/**
 * Generic production host bridges for Design-owned interactive surfaces.
 * Authorization and mutation truth remain in the underlying action modules;
 * this neutral path keeps first-class Design folders free of server-action
 * imports while preserving their production call signatures.
 */
export { issueInvitationAction, type IssueInvitationState } from '@/lib/actions/invitations'
export { duplicateTypeAction, setActiveTypeAction } from '@/lib/actions/documentTypes'
