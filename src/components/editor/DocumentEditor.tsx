'use client'

import type { MDXEditorMethods } from '@mdxeditor/editor'
import { useEffect, useRef, useState, useTransition } from 'react'

import { saveDocumentAction } from '@/lib/actions/saveDocument'
import { savePageAction } from '@/lib/actions/savePage'

import { ForwardRefEditor } from './ForwardRefEditor'
import {
  beginSave,
  createSaveState,
  editSaveState,
  isSaveStateDirty,
  resolveSave,
  type SaveSnapshot,
  type SaveState,
} from './saveState'

import styles from './DocumentEditor.module.scss'

type Props = {
  entityId: number | string
  /** Which collection this editor writes to (documents vs informational pages). */
  entityType: 'document' | 'page'
  tenantSlug: string
  initialTitle: string
  initialMarkdown: string
}

type Mode = 'edit' | 'source'

const LEAVE_MESSAGE = 'You have unsaved changes. Leave this page?'

function isModifiedClick(event: MouseEvent): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

export function DocumentEditor({
  entityId,
  entityType,
  tenantSlug,
  initialTitle,
  initialMarkdown,
}: Props) {
  const editorRef = useRef<MDXEditorMethods>(null)
  const [title, setTitle] = useState(initialTitle)
  const [markdown, setMarkdown] = useState(initialMarkdown)
  const [sourceText, setSourceText] = useState(initialMarkdown)
  const [mode, setMode] = useState<Mode>('edit')
  const [transitionPending, startTransition] = useTransition()
  const [saveState, setSaveState] = useState<SaveState>(() =>
    createSaveState({ title: initialTitle, body: initialMarkdown }),
  )

  const dirty = isSaveStateDirty(saveState)

  // Browser refresh/close and ordinary same-origin links (including Next.js
  // <Link>) must ask before discarding an edited snapshot. The capture-phase
  // listener runs before Next's delegated link handler, so cancellation leaves
  // the editor in place and confirmation allows the router event to proceed.
  useEffect(() => {
    if (!dirty) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = LEAVE_MESSAGE
    }

    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) return
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(target instanceof HTMLAnchorElement)) return
      if (target.hasAttribute('download') || (target.target && target.target !== '_self')) return

      const destination = new URL(target.href, window.location.href)
      if (destination.origin !== window.location.origin) return
      if (destination.href === window.location.href) return

      if (!window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onDocumentClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onDocumentClick, true)
    }
  }, [dirty])

  function updateCurrent(patch: Partial<SaveSnapshot>) {
    setSaveState((previous) =>
      editSaveState(previous, {
        ...previous.current,
        ...patch,
      }),
    )
  }

  function switchMode(next: Mode) {
    if (next === mode) return
    if (next === 'source') {
      // Seed the textarea with the WYSIWYG's current markdown. In rich-text
      // mode getMarkdown() returns the lossless Lexical serialization.
      const current = editorRef.current?.getMarkdown() ?? markdown
      setSourceText(current)
      updateCurrent({ body: current })
      setMode('source')
    } else {
      // Re-parse the textarea verbatim into the WYSIWYG (lossless import path).
      editorRef.current?.setMarkdown(sourceText)
      setMarkdown(sourceText)
      updateCurrent({ body: sourceText })
      setMode('edit')
    }
  }

  function onSave() {
    const attempt = beginSave(saveState)
    if (!attempt) return

    setSaveState(attempt.state)
    startTransition(async () => {
      let ok = false
      try {
        const result =
          entityType === 'document'
            ? await saveDocumentAction({
                documentId: entityId,
                tenantSlug,
                title: attempt.snapshot.title,
                body: attempt.snapshot.body,
              })
            : await savePageAction({
                pageId: entityId,
                tenantSlug,
                title: attempt.snapshot.title,
                body: attempt.snapshot.body,
              })
        ok = result.ok
      } catch {
        ok = false
      }

      setSaveState((previous) =>
        resolveSave(previous, attempt.requestId, attempt.snapshot, ok),
      )
    })
  }

  const statusText = transitionPending || saveState.pending
    ? 'Saving…'
    : saveState.status === 'saved'
      ? 'Saved'
      : saveState.status === 'error'
        ? 'Save failed — retry'
        : dirty
          ? 'Unsaved'
          : ''

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
          onChange={(e) => {
            const nextTitle = e.target.value
            setTitle(nextTitle)
            updateCurrent({ title: nextTitle })
          }}
        />
        <span className={styles.spacer} />
        <div className={styles.modeToggle} role="group" aria-label="Edit mode">
          <button
            type="button"
            className={mode === 'edit' ? styles.modeActive : styles.modeBtn}
            aria-pressed={mode === 'edit'}
            onClick={() => switchMode('edit')}
          >
            Edit
          </button>
          <button
            type="button"
            className={mode === 'source' ? styles.modeActive : styles.modeBtn}
            aria-pressed={mode === 'source'}
            onClick={() => switchMode('source')}
          >
            Source (advanced)
          </button>
        </div>
        <span className={styles.status} aria-live="polite">
          {statusText}
        </span>
        <button className={styles.saveButton} onClick={onSave} disabled={saveState.pending || transitionPending}>
          Save
        </button>
      </div>

      <div className={styles.bodyEditor} role="region" aria-label="Document editor content">
        <div className={mode === 'edit' ? styles.paneActive : styles.paneHidden}>
          <ForwardRefEditor
            markdown={initialMarkdown}
            ref={editorRef}
            onChange={(nextMarkdown) => {
              setMarkdown(nextMarkdown)
              updateCurrent({ body: nextMarkdown })
            }}
            contentEditableClassName="mdx-editor-content"
          />
        </div>
        <textarea
          className={mode === 'source' ? styles.sourceArea : styles.paneHidden}
          value={sourceText}
          onChange={(e) => {
            const nextSource = e.target.value
            setSourceText(nextSource)
            updateCurrent({ body: nextSource })
          }}
          spellCheck={false}
          aria-label="Markdown source"
        />
      </div>
    </div>
  )
}
