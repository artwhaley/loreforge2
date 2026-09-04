import { notFound } from 'next/navigation'
import Link from 'next/link'

import { FillForm } from '@/components/forms/FillForm'
import { TenantShell } from '@/components/theme/TenantShell'
import type { FillField } from '@/lib/actions/forms'
import { assertFormSchema } from '@/lib/forms/schema'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getFormForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

import styles from './fill.module.scss'

type Props = {
  params: Promise<{ slug: string; formId: string }>
}

export const dynamic = 'force-dynamic'

const ALLOWED: ReadonlySet<string> = new Set(['text', 'textarea', 'date', 'select', 'checkbox', 'character', 'characters'])

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

  const schema = assertFormSchema(form.formSchema)
  // Serialize only the neutral supported field types for the client fill form.
  const fillFields: FillField[] = []
  for (const field of schema.fields) {
    if (!ALLOWED.has(field.type)) continue
    fillFields.push({
      type: field.type,
      key: field.key,
      label: field.label ?? field.key,
      required: Boolean(field.required),
      ...(field.options && field.options.length > 0 ? { options: field.options } : {}),
      help: field.help,
      default: field.default,
      width: field.width,
      rows: field.rows,
      relationshipLabel: field.relationshipLabel,
    })
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
            Forms
          </Link>
          <span className={styles.sep}>/</span>
          <span>{form.name}</span>
        </nav>

        <h1 className={styles.title}>{form.name}</h1>
        <p className={styles.intro}>
          Submitting generates a normal archive record{form.destinationFolder ? ' filed in its destination folder' : ''} — you can edit, search, and export it like any other document.
        </p>

        <FillForm
          fields={fillFields}
          tenantSlug={tenant.slug}
          formId={Number(form.id)}
          submitLabel="Create document"
        />
      </section>
    </TenantShell>
  )
}
