'use client'

import { useState } from 'react'

import styles from './CopyMarkdownButton.module.scss'

export function CopyMarkdownButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be unavailable (non-secure context); ignore for MVP.
    }
  }

  return (
    <button type="button" onClick={copy} className={styles.btn}>
      {copied ? 'Copied' : 'Copy Markdown'}
    </button>
  )
}
