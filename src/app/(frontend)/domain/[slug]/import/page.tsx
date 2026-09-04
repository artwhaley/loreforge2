import { notFound } from 'next/navigation'

import { ImportSampleButton } from '@/components/archive/ImportSampleButton'
import { TenantShell } from '@/components/theme/TenantShell'
import { importMarkdownAction } from '@/lib/actions/archive'
import { buildFolderTree, flattenFolderTree } from '@/lib/archive/folderTree'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getFoldersForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

import styles from './import.module.scss'

const SAMPLE_NOTECARD = `# Patrol Contact Report

**Officer:** Alex Mercer  
**Date:** September 1, 2026  
**Location:** Ravenhurst Square

## Contact

Spoke with a resident regarding a noise complaint near the square. The resident agreed to lower the volume and no further action was required.

## Disposition

Closed without citation.`

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function ImportPage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }

  const base = `/domain/${tenant.slug}`
  const myTenants = user ? await getTenantsForUser(user.id) : []
  const folders = await getFoldersForTenant(tenant)
  const flat = flattenFolderTree(buildFolderTree(folders))
  const tokens = resolveThemeTokens(tenant)

  // Default and sample destination: a depth-2 folder named "Reports" (the fixture
  // destination), else the first folder, else the archive root.
  const reports = flat.find(({ folder, depth }) => depth === 2 && folder.name === 'Reports')
  const defaultFolderId = reports?.folder.id ?? flat[0]?.folder.id ?? null

  return (
    <TenantShell
      tenant={tenant}
      cssVars={themeTokensToCssVars(tokens)}
      role={role}
      switcherTenants={myTenants}
    >
      <section className={styles.panel}>
        <h1 className={styles.title}>Import a Markdown notecard</h1>
        <p className={styles.intro}>
          Paste Second Life notecard Markdown and file it as a normal archive record. It becomes a
          regular document you can view, edit, move, and search — exactly like a web-authored one.
        </p>

        <form action={importMarkdownAction} className={styles.form}>
          <input type="hidden" name="tenantSlug" value={tenant.slug} />

          <label className={styles.field}>
            <span className={styles.label}>Title</span>
            <input name="title" className={styles.input} required placeholder="e.g. Patrol Contact Report" />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Destination folder</span>
            <select name="folderId" className={styles.select} defaultValue={String(defaultFolderId ?? '')}>
              <option value="">No folder</option>
              {flat.map(({ folder, depth }) => (
                <option key={folder.id} value={folder.id}>
                  {'\u00A0'.repeat(depth * 2)}
                  {folder.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Markdown body</span>
            <textarea
              name="body"
              className={styles.textarea}
              rows={14}
              required
              spellCheck={false}
              placeholder="# Heading&#10;&#10;Paste notecard Markdown…"
            />
          </label>

          <div className={styles.actions}>
            <ImportSampleButton
              sampleTitle="Patrol Contact Report"
              sampleBody={SAMPLE_NOTECARD}
              sampleFolderValue={String(defaultFolderId ?? '')}
            />
            <button type="submit" className={styles.submit}>
              Import
            </button>
          </div>
        </form>
      </section>
    </TenantShell>
  )
}
