import Link from 'next/link'
import { notFound } from 'next/navigation'

import { renderMarkdown } from '@/lib/markdown/render'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDocumentForTenant } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

import { TenantShell } from '@/components/theme/TenantShell'

import styles from './document.module.scss'

type Props = {
  params: Promise<{ slug: string; id: string }>
}

export const dynamic = 'force-dynamic'

export default async function DocumentViewPage({ params }: Props) {
  const { slug, id } = await params
  const { tenant, role } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }

  const doc = await getDocumentForTenant(tenant, id)
  if (!doc) {
    notFound()
  }

  const tokens = resolveThemeTokens(tenant)
  const html = renderMarkdown(doc.body)

  return (
    <TenantShell
      tenant={tenant}
      cssVars={themeTokensToCssVars(tokens)}
      role={role}
    >
      <article className={styles.record}>
        <header className={styles.recordHeader}>
          <h1 className={styles.title}>{doc.title}</h1>
          <div className={styles.meta}>
            {typeof doc.createdAt === 'string' && (
              <span>Created {new Date(doc.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            )}
            {typeof doc.updatedAt === 'string' && doc.updatedAt !== doc.createdAt && (
              <span>Updated {new Date(doc.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            )}
            <span className={styles.origin}>{doc.origin.replace('-', ' ')}</span>
          </div>
        </header>
        <div
          className={styles.body}
          // Markdown is rendered from tenant-owned canonical text; raw HTML is not
          // part of the MVP dialect. marked escapes HTML by default when `gfm` sanitization
          // is not configured otherwise. (No arbitrary HTML support — spec 2.3.)
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>
    </TenantShell>
  )
}
