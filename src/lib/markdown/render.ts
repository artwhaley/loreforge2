import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

const SAFE_TAGS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'a',
  'blockquote',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'br',
] as const

const SAFE_ATTRIBUTES = {
  a: ['href', 'title'],
  th: ['align'],
  td: ['align'],
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isUnsafeHref(href: string): boolean {
  let normalized = href
  try {
    normalized = decodeURIComponent(href)
  } catch {
    // A malformed escape sequence is not a reason to accept an untrusted URL.
    return true
  }

  normalized = normalized.replace(/[\u0000-\u0020\u007f]+/g, '').toLowerCase()
  return (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('vbscript:') ||
    normalized.startsWith('data:') ||
    normalized.startsWith('file:') ||
    normalized.startsWith('//')
  )
}

// MVP Markdown dialect: headings, paragraphs, emphasis, lists, links,
// blockquotes, horizontal rules, tables. No raw HTML in user content.
marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    // Marked emits raw HTML as a separate token. Escape the token before the
    // generated string reaches sanitize-html so unsupported HTML remains
    // visible text rather than becoming active markup.
    html({ text }) {
      return escapeHtml(text)
    },
  },
})

/** Render canonical Markdown to HTML for the document viewer. */
export function renderMarkdown(markdown: string): string {
  const rendered = marked.parse(markdown, { async: false })

  return sanitizeHtml(rendered, {
    allowedTags: [...SAFE_TAGS],
    allowedAttributes: SAFE_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attribs) => {
        if (attribs.href && isUnsafeHref(attribs.href)) {
          const { href: _href, ...safeAttribs } = attribs
          return { tagName: 'a', attribs: safeAttribs }
        }
        return { tagName: 'a', attribs }
      },
    },
    disallowedTagsMode: 'discard',
    parseStyleAttributes: false,
  })
}
