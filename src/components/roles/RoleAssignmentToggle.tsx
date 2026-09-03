'use client'

type Props = {
  domainSlug: string
  characterId: number
  roleId: number
  checked: boolean
  label: string
}

/**
 * A checkbox that submits its own role assignment form. This belongs in a
 * Client Component because server-rendered pages cannot serialize event
 * handlers such as onClick/onChange across the RSC boundary.
 */
export function RoleAssignmentToggle({ domainSlug, characterId, roleId, checked, label }: Props) {
  return <form action="/api/role-assignments" method="post">
    <input type="hidden" name="domainSlug" value={domainSlug} />
    <input type="hidden" name="characterId" value={characterId} />
    <input type="hidden" name="roleId" value={roleId} />
    <input type="hidden" name="action" value={checked ? 'remove' : 'add'} />
    <label><input type="checkbox" defaultChecked={checked} onChange={(event) => event.currentTarget.form?.requestSubmit()} /> {label}</label>
  </form>
}
