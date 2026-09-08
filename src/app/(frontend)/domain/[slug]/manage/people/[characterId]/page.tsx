import { notFound } from 'next/navigation'

import { FolderTree, RoleTree } from '@/components/people/PersonAccessTrees'
import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { buildPersonManagementPageModel } from '@/lib/people/buildPersonManagementPageModel'
import styles from '@/components/people/PersonWorkspace.module.scss'

type Props = { params: Promise<{ slug: string; characterId: string }>; searchParams?: Promise<{ roleFilter?: string }> }
export const dynamic = 'force-dynamic'

/**
 * Person workspace (OBSIDIAN-T06). Thin route: the authorized builder owns
 * admission and the full projection (identity, participation, Role/Folder
 * trees, Type access, capabilities). The RoleTree/FolderTree primitives own
 * their own guarded interactions. Body renders inside the selected Design's
 * Shell via the design-aware TenantShell; T08 moves it behind a Design-owned
 * entrypoint.
 */
export default async function PersonWorkspacePage({ params, searchParams }: Props) {
  const { slug, characterId: rawCharacterId } = await params
  const characterId = Number(rawCharacterId)
  const query = await searchParams
  const roleFilter = query?.roleFilter === 'held' ? 'held' : 'assignable'
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) notFound()
  const model = await buildPersonManagementPageModel({ tenant, user, activeCharacter, characterId, roleFilter })
  if (!model) notFound()
  const domains = user ? await getTenantsForUser(user.id) : []
  return (
    <TenantShell tenant={tenant} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
      <section className={styles.page}>
        <p className={styles.crumb}><a href={`/domain/${slug}/manage/people`}>People</a> / {model.localDisplayName || model.character.name}</p>
        <header className={styles.identityHeader}>
          <div className={styles.nameLine}><h1>{model.localDisplayName || model.character.name}</h1><span className={styles.characterHandle}>{model.controller?.name || model.controller?.email || 'Unclaimed Character'}</span></div>
          {model.canManageMembers ? <form action="/api/domain-memberships" method="post" className={styles.removeForm}><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="characterId" value={characterId} /><input type="hidden" name="action" value="remove" /><button type="submit">Remove from Domain</button></form> : null}
        </header>
        <RoleTree domainSlug={slug} characterId={characterId} departments={model.roleDepartments} initialMode={roleFilter} />
        <section className={styles.typeAccess} aria-labelledby="type-access-heading">
          <div className={styles.detailHeading}><h2 id="type-access-heading">Record Type access</h2><p className={styles.panelMeta}>Effective access for {model.localDisplayName || model.character.name}, from Type grants and any Folder restrictions.</p></div>
          {model.typeAccess.length === 0 ? <p className={styles.panelMeta}>No active Document Types in this Domain.</p> : <table className={styles.typeTable}><thead><tr><th>Document Type</th><th>Read</th><th>Create</th><th>Edit</th><th>Source</th></tr></thead><tbody>{model.typeAccess.map((type) => <tr key={type.id}><td className={styles.typeName}>{type.name}</td><td>{type.read.allowed ? 'Allowed' : 'Denied'}</td><td>{type.create.allowed ? 'Allowed' : 'Denied'}</td><td>{type.edit.allowed ? 'Allowed' : 'Denied'}</td><td className={styles.typeSource}>{type.read.source}</td></tr>)}</tbody></table>}
        </section>
        <FolderTree domainSlug={slug} characterId={characterId} folders={model.folderNodes} />
        <section className={styles.recentWork}><h2>Recent Work</h2><p>Recent work will appear here when the activity feed is connected.</p></section>
      </section>
    </TenantShell>
  )
}