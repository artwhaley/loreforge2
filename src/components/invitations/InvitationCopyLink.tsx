'use client'

import { useState } from 'react'

export function InvitationCopyLink({ href }: { href: string }) {
  const [copied, setCopied] = useState(false)
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem' }}><code style={{ maxWidth: '28rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{href}</code><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(new URL(href, window.location.origin).toString()); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { setCopied(false) } }}>{copied ? 'Copied' : 'Copy link'}</button></span>
}

