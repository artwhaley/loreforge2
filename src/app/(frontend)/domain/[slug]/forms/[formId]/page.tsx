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

const ALLOWED: ReadonlySet<string> = new Set(['text', 'textarea', 'date', 'time', 'select', 'checkbox', 'character', 'characters'])

export default async function FillFormPage({ params }: Props) {
  const { slug, formId: formIdRaw } = await params
  const formId = Number(formIdRaw)
  const { tenant, role, user, activeCharacter } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug || !formId) {
    notFound()
  }

  const form = await getFormForTenant(tenant, formId)
  if (!form) {
    notFound()
  }
  // P08-GATE-06: gate the Form surface on create_document for its Type.
  // An unauthorized user must not see a Form they cannot submit.
  const { getLorePayload } = await import('@/lib/payload')
  const { isAllowed } = await import('@/lib/authz/evaluate')
  const payload = await getLorePayload()
  const formTypeId = typeof form.documentType === 'object' && form.documentType !== null ? Number(form.documentType.id) : Number(form.documentType)
  if (!user || !Number.isFinite(formTypeId) || !await isAllowed({ payload, actor: { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }, domainId: tenant.id, capability: 'create_document', resource: { type: 'DocumentType', id: formTypeId } })) notFound()

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
          Submitting generates a normal archive record routed by its Document Type lifecycle Folders — you can edit, search, and export it like any other document.
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
