/**
 * Human-facing label for a document's `origin` field. Keeps the badge text
 * consistent across the archive list, document viewer, home page, and theme
 * preview (Ticket 08 cleanup — a bare `.replace('-', ' ')` rendered
 * "markdown import" while the CMS labelled it "Markdown import").
 */
export function originLabel(origin: string): string {
  switch (origin) {
    case 'web-editor':
      return 'Web editor'
    case 'markdown-import':
      return 'Markdown import'
    case 'form':
      return 'Form'
    default:
      return origin
  }
}
