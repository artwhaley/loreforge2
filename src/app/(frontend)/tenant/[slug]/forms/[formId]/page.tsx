import { notFound } from 'next/navigation'
import Link from 'next/link'

import { FillForm } from '@/components/forms/FillForm'
import { TenantShell } from '@/components/theme/TenantShell'
import type { FillField } from '@/lib/actions/forms'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getFormForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

import styles from './fill.module.scss'

type Props = {
  params: Promise<{ slug: string; formId: string }>
}

export const dynamic = 'force-dynamic'

const ALLOWED: ReadonlySet<string> = new Set(['text', 'textarea', 'date', 'select', 'checkbox'])

export default async function FillFormPage({ params }: Props) {
  const { slug, formId: formIdRaw } = await params
  const formId = Number(formIdRaw)
  const { tenant, role, user } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug || !formId) {
    notFound()
  }

  const form = await getFormForTenant(tenant, formId)
  if (!form) {
    notFound()
  }

  const base = `/domain/${tenant.slug}`
  const myTenants = user ? await getTenantsForUser(user.id) : []
  const tokens = resolveThemeTokens(tenant)

  // Serialize only the five allowed field types for the client fill form.
  const fillFields: FillField[] = []
  for (const field of form.fields ?? []) {
    if (!ALLOWED.has(field.blockType)) continue
    if (field.blockType === 'select') {
      fillFields.push({
        blockType: 'select',
        name: field.name,
        label: field.label ?? field.name,
        required: Boolean(field.required),
        options: field.options ?? [],
      })
    } else {
      fillFields.push({
        blockType: field.blockType,
        name: field.name,
        label: field.label ?? field.name,
        required: Boolean(field.required),
      })
    }
  }

  return (
    <TenantShell
      tenant={tenant}
      cssVars={themeTokensToCssVars(tokens)}
      role={role}
      switcherTenants={myTenants}
    >
      <section className={styles.panel}>
        <nav className={styles.crumbs} aria-label="Folder path">
          <Link href={`${base}/forms`} className={styles.crumbLink}>
            Report forms
          </Link>
          <span className={styles.sep}>/</span>
          <span>{form.title}</span>
        </nav>

        <h1 className={styles.title}>{form.title}</h1>
        <p className={styles.intro}>
          Submitting generates a normal archive record{form.folder && typeof form.folder === 'object' ? ' filed in its destination folder' : ''} — you can edit, move, search, and export it like any other document.
        </p>

        <FillForm
          fields={fillFields}
          tenantSlug={tenant.slug}
          formId={Number(form.id)}
          submitLabel={form.submitButtonLabel?.trim() || 'Submit report'}
        />
      </section>
    </TenantShell>
  )
}
