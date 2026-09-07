'use client'

import type { RecordsPageModel } from '@/lib/page-models/records'
import { ExplorerBody } from './ExplorerBody'

/**
 * Civic Records preserves the compact two-pane explorer composition (spec
 * §25D): the visual composition is Design-owned, and the behavior runs on the
 * shared `useRecordsWorkspace` controller inside ExplorerBody.
 */
export function CivicRecords(model: RecordsPageModel) {
  return <ExplorerBody {...model} />
}
