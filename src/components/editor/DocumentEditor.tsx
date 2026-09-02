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

export function DocumentEditor({
  documentId,
  tenantSlug,
  initialTitle,
  initialMarkdown,
}: Props) {
  const editorRef = useRef<MDXEditorMethods>(null)
  const [title, setTitle] = useState(initialTitle)
  const [markdown, setMarkdown] = useState(initialMarkdown)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  function onSave() {
    const body = editorRef.current?.getMarkdown() ?? markdown
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
        <span className={styles.status}>
          {pending ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? 'Save failed' : ''}
        </span>
        <button className={styles.saveButton} onClick={onSave} disabled={pending}>
          Save
        </button>
      </div>
      <div className={styles.bodyEditor}>
        <ForwardRefEditor
          key={initialMarkdown}
          markdown={initialMarkdown}
          ref={editorRef}
          onChange={setMarkdown}
          contentEditableClassName="mdx-editor-content"
        />
      </div>
    </div>
  )
}
