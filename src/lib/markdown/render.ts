import { marked } from 'marked'

// MVP Markdown dialect: headings, paragraphs, emphasis, lists, links,
// blockquotes, horizontal rules, tables. No raw HTML in user content.
marked.use({
  gfm: true,
  breaks: false,
})

/** Render canonical Markdown to HTML for the document viewer. */
export function renderMarkdown(markdown: string): string {
  return marked.parse(markdown, { async: false })
}
