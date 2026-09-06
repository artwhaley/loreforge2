'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { TreeApi } from 'react-arborist'

import type { InspectorFolderNode } from '@/lib/documents/typeTree'

import type { PickerNode } from './ArboristFolderPicker'
import styles from './TypeTree.module.scss'

const ArboristFolderPicker = dynamic(() => import('./ArboristFolderPicker').then((module) => module.ArboristFolderPicker), {
  ssr: false,
  loading: () => <p className={styles.popupNote}>Loading folders…</p>,
})

const POPUP_TREE_HEIGHT = 280

function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** The folder path to the current pick so the popup opens with it visible. */
function pathTo(folders: InspectorFolderNode[], id: number): number[] {
  for (const node of folders) {
    if (node.id === id) return [node.id]
    const found = pathTo(node.children, id)
    if (found.length > 0) return [node.id, ...found]
  }
  return []
}

/**
 * P08X-T04: the graphical stage-folder picker — the same arborist control and
 * visual language as the Folders screen, compressed horizontally (~480px) to
 * feel like a popup. Static: no drag, single-select, explicit confirmation.
 */
export function FolderPickerPopup({ folders, currentId, onPick, onClear, onClose }: {
  folders: InspectorFolderNode[]
  currentId: number | null
  onPick: (id: number) => void
  onClear: () => void
  onClose: () => void
}) {
  const [selectedId, setSelectedId] = useState<number | null>(currentId)
  const treeRef = useRef<TreeApi<PickerNode> | undefined>(undefined)
  const [measureRef, measuredWidth] = useMeasure<HTMLDivElement>()
  const nodes = useMemo(() => {
    const toNode = (folder: InspectorFolderNode): PickerNode => ({ id: String(folder.id), name: folder.name, children: folder.children.map(toNode) })
    return folders.map(toNode)
  }, [folders])
  const openPath = useMemo(() => (currentId != null ? pathTo(folders, currentId).map((id) => String(id)) : []), [folders, currentId])

  useEffect(() => {
    if (openPath.length === 0 || !treeRef.current) return
    for (const id of openPath.slice(0, -1)) treeRef.current?.open(id)
    treeRef.current?.scrollTo(openPath[openPath.length - 1])
  }, [openPath])

  const nameOf = (id: number | null): string | null => {
    if (id == null) return null
    const walk = (list: InspectorFolderNode[]): string | null => {
      for (const node of list) {
        if (node.id === id) return node.name
        const found = walk(node.children)
        if (found) return found
      }
      return null
    }
    return walk(folders)
  }

  return <div className={styles.overlay} onClick={(event) => { if (event.target === event.currentTarget) onClose() }} role="dialog" aria-modal="true" aria-label="Choose a lifecycle stage folder">
    <div className={styles.popup}>
      <h3>Stage folder</h3>
      <p className={styles.popupNote} title="Documents at this lifecycle stage live in the folder you pick. Transitions into this stage move documents here automatically.">
        Choose the folder documents at this stage live in. Transitions into this stage move records here.
      </p>
      <div className={styles.popupTree} ref={measureRef}>
        <ArboristFolderPicker
          nodes={nodes}
          width={measuredWidth > 0 ? measuredWidth : 430}
          height={POPUP_TREE_HEIGHT}
          treeRef={treeRef}
          selectedId={selectedId != null ? String(selectedId) : undefined}
          onSelect={setSelectedId}
        />
      </div>
      {selectedId != null ? <p className={styles.popupNote}>Selected: <strong>{nameOf(selectedId) ?? `Folder #${selectedId}`}</strong></p> : null}
      <div className={styles.popupActions}>
        <button type="button" className={styles.primary} disabled={selectedId == null} title="Assign the selected folder to this lifecycle stage" onClick={() => { if (selectedId != null) onPick(selectedId) }}>Use this folder</button>
        <button type="button" className={styles.secondary} title="Clear the stage folder assignment (documents would use the legacy route fallback)" onClick={onClear}>No folder</button>
        <button type="button" className={styles.secondary} onClick={onClose}>Cancel</button>
      </div>
    </div>
  </div>
}