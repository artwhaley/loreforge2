/**
 * Canonical Markdown text is LF-newline only.
 *
 * HTML form serialization converts textarea values to CRLF, and Windows
 * paste sources may include lone CRs. Every text boundary that accepts
 * Markdown (import surface, editor saves) canonicalizes through this
 * helper so stored bodies are always LF — the "canonical Markdown"
 * contract of the MVP (spec §6.4).
 */
export function canonicalizeMarkdown(text: string): string {
  return text.replace(/\r\n?/g, '\n')
}
