import Link from 'next/link'
import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getLorePayload } from '@/lib/payload'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { deactivateTemplateAction, duplicateTemplateAction } from '@/lib/actions/templates'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const payload = await getLorePayload()
  const [templates, domains] = await Promise.all([
    payload.find({ collection: 'templates', where: { domain: { equals: tenant.id } }, depth: 1, limit: 500, sort: 'name', overrideAccess: true }),
    getTenantsForUser(user.id),
  ])
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: '1rem' }}>
      <nav aria-label="Templates and Forms"><Link href={`/domain/${slug}/forms`}>Forms</Link> · <Link href={`/domain/${slug}/templates`} aria-current="page">Templates</Link> · <Link href={`/domain/${slug}/document-types`}>Document Types</Link></nav>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h1>Templates</h1>{role === 'admin' ? <Link href={`/domain/${slug}/forms/new`}>Create form</Link> : null}</div>
      {role !== 'admin' ? <p>Templates are available through the authorized management workspace.</p> : null}
      <ul style={{ display: 'grid', gap: '.5rem', listStyle: 'none', padding: 0 }}>{templates.docs.map((template) => <li key={template.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '.75rem', border: '1px solid var(--tenant-border, #ddd)' }}><span><strong>{template.name}</strong> · {template.kind} · {template.active ? 'Active' : 'Inactive'}</span>{role === 'admin' ? <span style={{ display: 'flex', gap: '.5rem' }}>{template.active ? <form action={deactivateTemplateAction}><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="templateId" value={template.id} /><button type="submit">Deactivate</button></form> : null}<form action={duplicateTemplateAction}><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="templateId" value={template.id} /><button type="submit">Duplicate</button></form></span> : null}</li>)}</ul>
    </section>
  </TenantShell>
}
