'use client'

import type { MDXEditorMethods } from '@mdxeditor/editor'
import { useRef, useState, useTransition } from 'react'

import { saveDocumentAction } from '@/lib/actions/saveDocument'

import { ForwardRefEditor } from './ForwardRefEditor'

import styles from './DocumentEditor.module.scss'

type Props = {
  documentId: number | string
  tenantSlug: string
  initialTitle: string
  initialMarkdown: string
}

type Mode = 'edit' | 'source'

export function DocumentEditor({
  documentId,
  tenantSlug,
  initialTitle,
  initialMarkdown,
}: Props) {
  const editorRef = useRef<MDXEditorMethods>(null)
  const [title, setTitle] = useState(initialTitle)
  const [markdown, setMarkdown] = useState(initialMarkdown)
  const [sourceText, setSourceText] = useState(initialMarkdown)
  const [mode, setMode] = useState<Mode>('edit')
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  function switchMode(next: Mode) {
    if (next === mode) return
    if (next === 'source') {
      // Seed the textarea with the WYSIWYG's current markdown. In rich-text
      // mode getMarkdown() returns the lossless Lexical serialization.
      const current = editorRef.current?.getMarkdown() ?? markdown
      setSourceText(current)
      setMode('source')
    } else {
      // Re-parse the textarea verbatim into the WYSIWYG (lossless import path).
      editorRef.current?.setMarkdown(sourceText)
      setMode('edit')
    }
  }

  function onSave() {
    // In source mode the textarea holds the canonical markdown verbatim — no
    // re-serialization, so save the text directly. In edit mode use the
    // WYSIWYG serialization (markdown$), which preserves block structure.
    const body = mode === 'source' ? sourceText : (editorRef.current?.getMarkdown() ?? markdown)
    setStatus('idle')
    startTransition(async () => {
      const result = await saveDocumentAction({ documentId, tenantSlug, title, body })
      setStatus(result.ok ? 'saved' : 'error')
    })
  }

  return (
    <div className={styles.editor}>
      <div className={styles.editorHeader}>
        <label className={styles.titleLabel} htmlFor="doc-title">
          Title
        </label>
        <input
          id="doc-title"
          className={styles.titleInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <span className={styles.spacer} />
        <div className={styles.modeToggle} role="group" aria-label="Edit mode">
          <button
            type="button"
            className={mode === 'edit' ? styles.modeActive : styles.modeBtn}
            onClick={() => switchMode('edit')}
          >
            Edit
          </button>
          <button
            type="button"
            className={mode === 'source' ? styles.modeActive : styles.modeBtn}
            onClick={() => switchMode('source')}
          >
            Source
          </button>
        </div>
        <span className={styles.status}>
          {pending ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? 'Save failed' : ''}
        </span>
        <button className={styles.saveButton} onClick={onSave} disabled={pending}>
          Save
        </button>
      </div>

      <div className={styles.bodyEditor}>
        <div className={mode === 'edit' ? styles.paneActive : styles.paneHidden}>
          <ForwardRefEditor
            markdown={initialMarkdown}
            ref={editorRef}
            onChange={setMarkdown}
            contentEditableClassName="mdx-editor-content"
          />
        </div>
        <textarea
          className={mode === 'source' ? styles.sourceArea : styles.paneHidden}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          spellCheck={false}
          aria-label="Markdown source"
        />
      </div>
    </div>
  )
}
