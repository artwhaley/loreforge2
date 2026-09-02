'use client'

import type { MouseEvent } from 'react'

import styles from './ImportSampleButton.module.scss'

export function ImportSampleButton({
  sampleTitle,
  sampleBody,
  sampleFolderValue,
}: {
  sampleTitle: string
  sampleBody: string
  sampleFolderValue: string
}) {
  function load(e: MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form
    if (!form) return
    const title = form.elements.namedItem('title') as HTMLInputElement | null
    const body = form.elements.namedItem('body') as HTMLTextAreaElement | null
    const folder = form.elements.namedItem('folderId') as HTMLSelectElement | null
    if (title) title.value = sampleTitle
    if (body) body.value = sampleBody
    if (folder && sampleFolderValue) folder.value = sampleFolderValue
  }

  return (
    <button type="button" onClick={load} className={styles.btn}>
      Load sample notecard
    </button>
  )
}
