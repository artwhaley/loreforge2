import type { ReactNode } from 'react'
import styles from '@/app/(frontend)/domain/[slug]/documents/[id]/document.module.scss'

export function DocumentPaper({ title, meta, html, source, before, children }: {
  title: string; meta: ReactNode; html: string; source?: string; before?: ReactNode; children?: ReactNode
}) {
  return <div className={styles.documentPage}>
    {before}
    <header className={styles.recordHeader}><h1 className={styles.title}>{title}</h1><div className={styles.meta}>{meta}</div></header>
    {source !== undefined ? <pre className={styles.source}>{source}</pre> : <div className={styles.body} dangerouslySetInnerHTML={{ __html: html }} />}
    {children}
  </div>
}
