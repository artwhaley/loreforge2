'use server'

import { documentWorkflowAction } from '@/lib/actions/documentWorkflow'

/**
 * Action bridges (OBSIDIAN-T07). Designs render `<form action={approveWorkItem}>`
 * (or reject) instead of importing the canonical workflow action directly;
 * the server action still re-authorizes every submission server-side.
 */
export const approveWorkItem = documentWorkflowAction
export const rejectWorkItem = documentWorkflowAction