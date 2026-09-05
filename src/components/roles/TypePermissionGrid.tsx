'use client'

import { useMemo, useState } from 'react'

import { PermissionAxis, type PermissionState } from '@/components/people/PersonAccessTrees'
import { CAPABILITY_LABELS } from '@/lib/permissions/capabilities'

import styles from './TypePermissionGrid.module.scss'

/** Ordinary capabilities exposed as primary columns (P07X-T04 §3.3). */
export const ORDINARY_TYPE_CAPABILITIES = ['read', 'create_document', 'edit_document', 'delete_document', 'submit_document', 'approve_document'] as const
/** Less-common lifecycle/admin capabilities kept under Advanced. */
export const ADVANCED_TYPE_CAPABILITIES = ['file_document', 'lock_document', 'unlock_document', 'restore_document', 'export_document'] as const

export type TypeStateMap = Record<string, Record<string, PermissionState>>

type Props = {
  domainSlug: string
  principalType: 'Role' | 'Character'
  principalId: number
  types: Array<{ id: number; name: string }>
  statesByType: TypeStateMap
  canManage: boolean
}

function CapabilityCell({ capability, state, onChange, disabled }: { capability: string; state: PermissionState; onChange: (next: PermissionState) => void; disabled?: boolean }) {
  return <td className={styles.cell}><PermissionAxis label={CAPABILITY_LABELS[capability as keyof typeof CAPABILITY_LABELS] ?? capability} state={state} onChange={onChange} disabled={disabled} /></td>
}

/**
 * P07X-T04: the primary Role × Document Type capability surface. A tester can
 * answer "What can Warriors do?" from this grid alone — the Folder controls
 * (FolderTree) move to the Advanced section of the same panel.
 */
export function TypePermissionGrid({ domainSlug, principalType, principalId, types, statesByType, canManage }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const ordinary = useMemo(() => [...ORDINARY_TYPE_CAPABILITIES], [])
  const advanced = useMemo(() => [...ADVANCED_TYPE_CAPABILITIES], [])
  const initial = useMemo(() => JSON.stringify(statesByType), [statesByType])
  const [drafts, setDrafts] = useState<TypeStateMap>(statesByType)
  // When the server re-renders with fresh rule states (after a save round-trip),
  // adopt them instead of keeping stale local drafts.
  const [lastServer, setLastServer] = useState(initial)
  if (lastServer !== initial) {
    setLastServer(initial)
    setDrafts(statesByType)
  }
  const setCell = (typeId: number, capability: string, next: PermissionState) => {
    setDrafts((current) => ({ ...current, [String(typeId)]: { ...(current[String(typeId)] ?? {}), [capability]: next } }))
  }
  if (types.length === 0) return <p className={styles.empty}>No active Document Types in this Domain yet — create one to grant work on records.</p>
  const columns = showAdvanced ? [...ordinary, ...advanced] : ordinary
  return <section className={styles.gridSection} aria-labelledby="type-access-heading">
    <div className={styles.gridHeader}><div><h2 id="type-access-heading">Record Type access</h2><p className={styles.gridMeta}>What this {principalType === 'Role' ? 'Role' : 'Character'} may do with each Document Type. Folder controls sit below under Advanced — Folders organize and restrict this work, they do not grant it.</p></div><button type="button" className={styles.advancedToggle} onClick={() => setShowAdvanced((value) => !value)} aria-expanded={showAdvanced}>{showAdvanced ? 'Hide advanced capabilities' : 'Advanced capabilities…'}</button></div>
    <div className={styles.tableScroll}>
      <table className={styles.grid}>
        <thead><tr><th className={styles.typeHeader}>Document Type</th>{columns.map((capability) => <th key={capability} className={styles.capHeader} scope="col">{CAPABILITY_LABELS[capability as keyof typeof CAPABILITY_LABELS] ?? capability}</th>)}<th className={styles.saveHeader} scope="col">Save</th></tr></thead>
        <tbody>
          {types.map((type) => {
            const states = drafts[String(type.id)] ?? {}
            return <tr key={type.id} className={styles.row}>
              <th className={styles.typeCell} scope="row">{type.name}</th>
              {columns.map((capability) => <CapabilityCell key={capability} capability={capability} state={states[capability] ?? 'inherit'} onChange={(next) => setCell(type.id, capability, next)} disabled={!canManage} />)}
              <td className={styles.cell}><form action="/api/permission-rules" method="post"><input type="hidden" name="domainSlug" value={domainSlug} /><input type="hidden" name={principalType === 'Role' ? 'roleId' : 'characterId'} value={principalId} /><input type="hidden" name="principalType" value={principalType} /><input type="hidden" name="resourceType" value="DocumentType" /><input type="hidden" name="typeId" value={type.id} /><input type="hidden" name="capabilityStates" value={JSON.stringify(states)} /><button type="submit" className={styles.saveButton} disabled={!canManage}>Save</button></form></td>
            </tr>
          })}
        </tbody>
      </table>
    </div>
  </section>
}