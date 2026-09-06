'use client'

import { useEffect, useMemo, useState } from 'react'

import type { InspectorRole } from '@/lib/documents/typeTree'

import styles from './TypeTree.module.scss'

/**
 * P08X-T04: one cell of the lifecycle table — a role list with chips and an
 * add-role popover. `title` carries the human-readable definition of the
 * permission column for hovertext.
 */
export function RoleListEditor({ label, title, roles, selected, onChange }: {
  label: string
  title: string
  roles: InspectorRole[]
  selected: number[]
  onChange: (ids: number[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null)

  const byId = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles])
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    return roles.filter((role) => role.active !== false && (term === '' || role.name.toLocaleLowerCase().includes(term)))
  }, [roles, query])

  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent | MouseEvent) => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') { setOpen(false); setQuery('') }
      if (event instanceof MouseEvent) setOpen(false)
    }
    window.addEventListener('click', close)
    window.addEventListener('keydown', close)
    return () => { window.removeEventListener('click', close); window.removeEventListener('keydown', close) }
  }, [open])

  const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter((existing) => existing !== id) : [...selected, id])

  return <>
    <div className={styles.roleEditor}>
      <span title={title}>{label}</span>
      <div className={styles.roleChips}>
        {selected.map((id) => {
          const role = byId.get(id)
          return <span key={id} className={`${styles.roleChip} ${role?.active === false ? styles.roleInactive : ''}`} title={role ? role.name : `Role #${id}`}>
            {role?.name ?? `Role #${id}`}
            <button type="button" aria-label={`Remove ${role?.name ?? `role ${id}`} from ${label}`} onClick={(event) => { event.stopPropagation(); toggle(id) }}>×</button>
          </span>
        })}
        <button
          type="button"
          className={styles.addRole}
          title={`Add roles to ${label} — ${title}`}
          onClick={(event) => {
            event.stopPropagation()
            const rect = event.currentTarget.getBoundingClientRect()
            setAnchor({ x: rect.left, y: rect.bottom + 4 })
            setOpen((current) => !current)
            setQuery('')
          }}
        >+ Add</button>
      </div>
    </div>
    {open && anchor ? <div className={styles.rolePopover} style={{ left: anchor.x, top: anchor.y }} onClick={(event) => event.stopPropagation()} role="menu" aria-label={`${label} roles`}>
      <input
        type="search"
        placeholder="Filter roles…"
        value={query}
        autoFocus
        onChange={(event) => setQuery(event.target.value)}
        aria-label={`Filter roles for ${label}`}
      />
      {filtered.length === 0 ? <p style={{ margin: '.3rem .45rem', color: 'var(--tenant-muted-text)', fontSize: '.74rem' }}>No roles match.</p> : null}
      {filtered.map((role) => (
        <label key={role.id} role="menuitemcheckbox" aria-checked={selected.includes(role.id)} title={`${role.name} — grant this role ${label.toLowerCase()}`}>
          <input type="checkbox" checked={selected.includes(role.id)} onChange={() => toggle(role.id)} />
          {role.name}
        </label>
      ))}
    </div> : null}
  </>
}