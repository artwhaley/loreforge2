'use client'

import { MoreHorizontal } from 'lucide-react'
import { ActionMenu, type Action } from './controls'

type ActionBridge = (formData: FormData) => void | Promise<void>

type Props = {
  domainSlug: string
  recordId: number | string
  lifecycle: string
  locked: boolean
  isSuperseded: boolean
  capabilities: {
    edit: boolean
    submit: boolean
    file: boolean
    approve: boolean
    deprecate: boolean
    restore: boolean
    lock: boolean
    unlock: boolean
    supersede: boolean
    delete: boolean
  }
  routes: {
    editUrl: string | null
    historyUrl: string | null
    supersedeUrl: string | null
  }
  workflowAction: ActionBridge | null
  deleteAction: ActionBridge | null
}

export function DocumentActionMenu({
  domainSlug,
  recordId,
  lifecycle,
  locked,
  isSuperseded,
  capabilities,
  routes,
  workflowAction,
  deleteAction,
}: Props) {
  const items: Action[] = []
  if (capabilities.edit && !isSuperseded && routes.editUrl) items.push({ key: 'edit', label: 'Edit', href: routes.editUrl })
  if (routes.historyUrl) items.push({ key: 'history', label: 'History', href: routes.historyUrl })
  if (lifecycle === 'draft' && capabilities.submit && workflowAction) items.push({ key: 'submit', label: 'Submit for review' })
  if (lifecycle === 'draft' && capabilities.file && workflowAction) items.push({ key: 'file', label: 'File now' })
  if (lifecycle === 'submitted' && capabilities.approve && workflowAction) items.push({ key: 'approve', label: 'Approve' })
  if (lifecycle === 'filed' && capabilities.deprecate && workflowAction) items.push({ key: 'deprecate', label: 'Deprecate' })
  if (lifecycle === 'deprecated' && capabilities.restore && workflowAction) items.push({ key: 'restore', label: 'Restore' })
  if (capabilities.lock && !locked && !isSuperseded && workflowAction) items.push({ key: 'lock', label: 'Lock' })
  if (capabilities.unlock && locked && !isSuperseded && workflowAction) items.push({ key: 'unlock', label: 'Unlock' })
  if (capabilities.supersede && !isSuperseded && routes.supersedeUrl) items.push({ key: 'supersede', label: 'Supersede', href: routes.supersedeUrl })
  if (capabilities.delete && deleteAction) items.push({ key: 'delete', label: 'Delete', danger: true })
  if (items.length === 0) return null

  const submit = (operation: string, action: ActionBridge) => {
    const form = new FormData()
    form.set('tenantSlug', domainSlug)
    form.set('documentId', String(recordId))
    form.set('operation', operation)
    void action(form)
  }

  const onAction = (action: Action) => {
    if (action.href) {
      window.location.assign(action.href)
      return
    }
    if (action.key === 'delete') {
      if (deleteAction) submit('delete', deleteAction)
      return
    }
    if (workflowAction) submit(action.key, workflowAction)
  }

  return <ActionMenu label="Document actions" trigger={<><MoreHorizontal size={18} /> Actions</>} items={items} onAction={onAction} />
}
