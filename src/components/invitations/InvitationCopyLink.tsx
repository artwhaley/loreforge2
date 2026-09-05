'use client'

import { useState } from 'react'

export function InvitationCopyLink({ href }: { href: string }) {
  const [copied, setCopied] = useState(false)
  const full = (typeof window !== 'undefined' ? window.location.origin : '') + href
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem', flexWrap: 'wrap' }}>
      <code style={{ maxWidth: '28rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{href}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(new URL(href, window.location.origin).toString())
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
          } catch {
            // Clipboard API unavailable (non-secure context / denied): fall back
            // to selecting the visible link text for manual copy.
            try {
              const selection = window.getSelection()
              const range = document.createRange()
              const node = document.getElementById(`invite-link-${href.length}-${href.slice(-6)}`)
              if (node && selection) { selection.removeAllRanges(); range.selectNodeContents(node); selection.addRange(range) }
            } catch { /* manual selection remains available */ }
            setCopied(false)
          }
        }}
      >
        {copied ? 'Copied' : 'Copy link'}
      </button>
      <span aria-live="polite">{copied ? 'Copied to clipboard.' : ''}</span>
      <span style={{ fontSize: '.85rem' }}>Full link: <span id={`invite-link-${href.length}-${href.slice(-6)}`}>{full}</span></span>
    </span>
  )
}

