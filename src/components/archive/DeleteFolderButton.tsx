'use client'

import { useActionState } from 'react'

import { deleteFolderAction } from '@/lib/actions/archive'

import styles from './DeleteFolderButton.module.scss'

export function DeleteFolderButton({
  tenantSlug,
  folderId,
}: {
  tenantSlug: string
  folderId: number
}) {
  const [state, formAction] = useActionState(deleteFolderAction, null)

  return (
    <form
      action={formAction}
      className={styles.form}
      onClick={(e) => e.stopPropagation()}
      title="Delete this folder"
    >
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="folderId" value={folderId} />
      <button type="submit" className={styles.btn} aria-label="Delete folder">
        ×
      </button>
      {state?.message ? <span className={styles.msg}>{state.message}</span> : null}
    </form>
  )
}
