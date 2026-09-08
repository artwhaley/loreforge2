import type { ManagementStatusDescriptor } from '@/lib/page-models/management/common'

const DEPARTMENT_ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'You are not authorized to manage Departments with the selected acting Character.',
  invalid: 'That Department name is invalid.',
  duplicate: 'A Department with that name already exists.',
  failed: 'That Department action could not be completed.',
}

/** Pure status mapping for the Departments surface (OBSIDIAN-T07). */
export function departmentStatusDescriptor(error?: string): ManagementStatusDescriptor {
  const message = error ? DEPARTMENT_ERROR_MESSAGES[error] : undefined
  return message ? { level: 'error', message } : null
}