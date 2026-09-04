import { notFound } from 'next/navigation'
import Link from 'next/link'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getFormsForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { getLorePayload } from '@/lib/payload'
import { isAllowed } from '@/lib/authz/evaluate'

import styles from './forms.module.scss'

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function FormsPage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }

  const base = `/domain/${tenant.slug}`
  const myTenants = user ? await getTenantsForUser(user.id) : []
  const payload = await getLorePayload()
  const canManageTemplates = Boolean(user && await isAllowed({ payload, actor: { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }, domainId: tenant.id, capability: 'manage_templates', resource: { type: 'Domain', id: tenant.id } }))
  const forms = await getFormsForTenant(tenant)
  const tokens = resolveThemeTokens(tenant)

  return (
    <TenantShell
      tenant={tenant}
      cssVars={themeTokensToCssVars(tokens)}
      role={role}
      switcherTenants={myTenants}
    >
      <section className={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h1 className={styles.title}>Forms</h1>{canManageTemplates ? <Link href={`${base}/forms/new`}>Create form</Link> : null}</div>
        <p className={styles.intro}>
          Build and fill structured forms that generate ordinary archive records.
        </p>

        <nav aria-label="Templates and Forms" style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem' }}>
          <Link href={`${base}/forms`} aria-current="page">Forms</Link>
          <Link href={`${base}/templates`}>Templates</Link>
          <Link href={`${base}/document-types`}>Document Types</Link>
        </nav>

        {forms.length === 0 ? (
          <p className={styles.empty}>No report forms have been set up for this Domain yet.</p>
        ) : (
          <ul className={styles.list}>
            {forms.map((form) => {
              const fieldCount = form.formSchema && typeof form.formSchema === 'object' && 'fields' in form.formSchema && Array.isArray(form.formSchema.fields) ? form.formSchema.fields.length : 0
              const active = Boolean(form.active)
              return (
              <li key={form.id} className={styles.listItem}>
                <div className={styles.card}>
                  <div className={styles.cardMain}>
                    {active ? <Link href={`${base}/forms/${form.id}`} className={styles.formTitleLink}>{form.name}</Link> : <span className={styles.formTitleMuted}>{form.name}</span>}
                    <span className={styles.meta}>{fieldCount} fields · {active ? 'Active' : 'Inactive'}</span>
                  </div>
                  {canManageTemplates ? <span className={styles.manageActions}><Link href={`${base}/forms/${form.id}/edit`}>Edit</Link></span> : null}
                </div>
              </li>
              )
            })}
          </ul>
        )}
      </section>
    </TenantShell>
  )
}
