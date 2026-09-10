'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { type RoleDepartment, type RoleTreeNode } from '@/components/people/PersonAccessTrees'
import type { RoleManagementPageModel } from '@/lib/page-models/management/roles'
import { flattenRoleNodes } from '@/lib/roles/roleManagement'

export type RoleSearchResult = { id: number; name: string; localName: string | null; controllerName: string | null; roles: string[]; departments: string[] }
export type RoleDialog = 'create' | 'delete' | 'assign' | null
export type RoleMenuState = { x: number; y: number; node: RoleTreeNode; department: RoleDepartment } | null

/**
 * Shared Role-management workspace (OBSIDIAN-T04). Owns the interactive state
 * machine — role selection, context menu, dialogs, debounced people search
 * (debounce/cancellation semantics preserved from RoleManager), assignment
 * selection — and hides the guarded `/api/roles` + `/api/role-assignments`
 * transports. A Design supplies only presentation.
 *
 * Authorization is NOT here: the model carries `manageableDepartmentIds` /
 * `assignableRoleIds` for UI affordances only; the server re-authorizes.
 */
export function useRoleManagementWorkspace(model: RoleManagementPageModel) {
  const router = useRouter()
  const { domainSlug, departments, roleRecords, manageableDepartmentIds, assignableRoleIds, initialRoleId } = model

  const allRoles = useMemo(() => departments.flatMap((department) => flattenRoleNodes(department.roles)), [departments])
  const firstRoleId = initialRoleId && allRoles.some((role) => role.id === initialRoleId) ? initialRoleId : allRoles[0]?.id ?? null

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(firstRoleId)
  const [menu, setMenu] = useState<RoleMenuState>(null)
  const [dialog, setDialog] = useState<RoleDialog>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RoleSearchResult[]>([])
  const [selectedPeople, setSelectedPeople] = useState<RoleSearchResult[]>([])

  const selectedRole = allRoles.find((role) => role.id === selectedRoleId) ?? null
  const selectedRecord = roleRecords.find((role) => role.id === selectedRoleId) ?? null
  const selectedDepartment = selectedRole ? departments.find((department) => department.roles.some((root) => flattenRoleNodes([root]).some((role) => role.id === selectedRole.id))) ?? null : null

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menu])

  useEffect(() => {
    const value = query.trim()
    const controller = new AbortController()
    // P05R-T08: the guard (empty query / not the assign dialog) clears stale
    // results from inside the debounce callback, not synchronously in the
    // effect body; results only render inside the assign dialog.
    const timer = window.setTimeout(() => {
      if (!value || dialog !== 'assign') { setResults([]); return }
      void fetch(`/api/people-search?domainSlug=${encodeURIComponent(domainSlug)}&q=${encodeURIComponent(value)}`, { signal: controller.signal })
        .then((response) => response.json() as Promise<{ results?: RoleSearchResult[] }>)
        .then((body) => setResults(body.results ?? []))
        .catch((error: unknown) => {
          if ((error as { name?: string }).name !== 'AbortError') setResults([])
        })
    }, 180)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [domainSlug, dialog, query])

  const selectRole = (node: RoleTreeNode, department: RoleDepartment) => {
    setSelectedRoleId(node.id)
    setMenu(null)
    setDialog(null)
    void department
  }

  const openMenu = (event: React.MouseEvent, node: RoleTreeNode, department: RoleDepartment) => {
    event.preventDefault()
    event.stopPropagation()
    setSelectedRoleId(node.id)
    setMenu({ x: event.clientX, y: event.clientY, node, department })
  }

  const openDialog = (next: Exclude<RoleDialog, null>) => {
    setMenu(null)
    setDialog(next)
    setQuery('')
    setResults([])
    setSelectedPeople([])
  }

  const closeDialog = () => setDialog(null)
  const closeMenu = () => setMenu(null)

  const createRole = async (name: string, parentRoleId: number | null, subdomainId: number | null) => {
    if (!name.trim()) return
    const body = new FormData()
    body.set('domainSlug', domainSlug)
    if (parentRoleId != null) body.set('parentRoleId', String(parentRoleId))
    if (subdomainId != null) body.set('subdomainId', String(subdomainId))
    body.set('name', name.trim())
    const response = await fetch('/api/roles', { method: 'POST', body })
    if (!response.ok || (response.redirected && new URL(response.url).searchParams.has('error'))) throw new Error('The change could not be saved. Check your access and try again.')
    router.refresh()
  }

  const deleteRole = async (roleId: number) => {
    const body = new FormData()
    body.set('domainSlug', domainSlug)
    body.set('roleId', String(roleId))
    body.set('action', 'delete')
    const response = await fetch('/api/roles', { method: 'POST', body })
    if (!response.ok || (response.redirected && new URL(response.url).searchParams.has('error'))) throw new Error('The change could not be saved. Check your access and try again.')
    router.refresh()
  }

  const assignRole = async (roleId: number, characterIds: number[]) => {
    const body = new FormData()
    body.set('domainSlug', domainSlug)
    body.set('roleId', String(roleId))
    body.set('action', 'add')
    for (const characterId of characterIds) body.append('characterId', String(characterId))
    const response = await fetch('/api/role-assignments', { method: 'POST', body })
    if (!response.ok || (response.redirected && new URL(response.url).searchParams.has('error'))) throw new Error('The change could not be saved. Check your access and try again.')
    // Preserve the original navigation behavior: land back on the role page
    // with the just-assigned role selected.
    router.push(`/domain/${domainSlug}/roles?roleId=${roleId}`)
  }

  const togglePerson = (person: RoleSearchResult) => {
    setSelectedPeople((current) => current.some((item) => item.id === person.id)
      ? current.filter((item) => item.id !== person.id)
      : [...current, person])
  }

  return {
    allRoles,
    selectedRoleId, setSelectedRoleId,
    selectRole,
    selectedRole, selectedRecord, selectedDepartment,
    menu, openMenu, closeMenu,
    dialog, openDialog, closeDialog,
    query, setQuery, results,
    selectedPeople, togglePerson,
    createRole, deleteRole, assignRole,
  }
}
