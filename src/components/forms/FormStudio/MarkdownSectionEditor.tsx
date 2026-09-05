'use client'

import { useRef, useState } from 'react'
import type { MDXEditorMethods } from '@mdxeditor/editor'

import { canonicalizeMarkdown } from '@/lib/markdown/canonical'
import { ForwardRefEditor } from '@/components/editor/ForwardRefEditor'

import styles from './FormStudio.module.scss'

type Props = {
  name: string
  label: string
  description: string
  initialValue?: string | null
  onDirty?: () => void
  onValueChange?: (value: string) => void
}

/**
 * A small, safe Markdown surface for fixed Form framing. The WYSIWYG toolbar
 * is the same supported Archive dialect as the ordinary Document editor; the
 * Source tab is intentionally a lossless textarea for advanced authors.
 */
export function MarkdownSectionEditor({ name, label, description, initialValue = '', onDirty, onValueChange }: Props) {
  const editorRef = useRef<MDXEditorMethods>(null)
  const initial = canonicalizeMarkdown(initialValue ?? '')
  const [markdown, setMarkdown] = useState(initial)
  const [sourceText, setSourceText] = useState(initial)
  const [mode, setMode] = useState<'edit' | 'source'>('edit')

  const update = (next: string) => {
    const canonical = canonicalizeMarkdown(next)
    setMarkdown(canonical)
    setSourceText(canonical)
    if (canonical !== initial) onDirty?.()
    onValueChange?.(canonical)
  }

  const switchMode = (next: 'edit' | 'source') => {
    if (next === mode) return
    if (next === 'source') {
      const current = editorRef.current?.getMarkdown() ?? markdown
      const canonical = canonicalizeMarkdown(current)
      setSourceText(canonical)
      setMarkdown(canonical)
    } else {
      const canonical = canonicalizeMarkdown(sourceText)
      editorRef.current?.setMarkdown(canonical)
      setSourceText(canonical)
      setMarkdown(canonical)
    }
    setMode(next)
  }

  return <fieldset style={{ display: 'grid', gap: '.45rem', border: '1px solid var(--tenant-border, #ddd)', borderRadius: 6, padding: '1rem' }}>
    <legend className={styles.groupLabel}>{label}</legend>
    <p className={styles.muted}>{description}</p>
    <input type="hidden" name={name} value={markdown} readOnly />
    <div role="group" aria-label={`${label} editor mode`} style={{ display: 'flex', gap: '.4rem' }}>
      <button type="button" className={styles.viewButton} aria-pressed={mode === 'edit'} onClick={() => switchMode('edit')}>Edit</button>
      <button type="button" className={styles.viewButton} aria-pressed={mode === 'source'} onClick={() => switchMode('source')}>Source (advanced)</button>
    </div>
    <div style={{ display: mode === 'edit' ? 'block' : 'none', border: '1px solid var(--tenant-border, #ddd)', borderRadius: 4, minHeight: 140 }} aria-hidden={mode !== 'edit'}>
      <ForwardRefEditor
        markdown={markdown}
        ref={editorRef}
        onChange={update}
        contentEditableClassName="mdx-editor-content"
      />
    </div>
    <textarea
      className={styles.textarea}
      style={{ display: mode === 'source' ? 'block' : 'none', minHeight: 140 }}
      value={sourceText}
      onChange={(event) => update(event.target.value)}
      spellCheck={false}
      aria-label={`${label} Markdown source`}
    />
  </fieldset>
}
