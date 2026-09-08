'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { resolveDesign, DESIGN_KEYS } from '@/lib/design/registry'
import { designPreviewTheme } from '@/lib/design/previewTheme'
import type { StoredDesignBank } from '@/lib/design/v2'
import { saveSiteDesignAction } from '@/lib/actions/saveSiteDesign'
import { uploadDesignAssetAction } from '@/lib/actions/uploadDesignAsset'
import { uploadThemeAssetAction } from '@/lib/actions/uploadThemeAsset'
import {
  DEPARTMENTS_PREVIEW_MODEL,
  DOCUMENT_PREVIEW_MODEL,
  HOME_PREVIEW_MODEL,
  RECORDS_PREVIEW_MODEL,
  SHELL_PREVIEW_MODEL,
} from '@/lib/design/fixtures'

import { PreviewViewport } from '@/components/theme/PreviewViewport'
import styles from './SiteStudio.module.scss'

type PreviewSurface = 'home' | 'records' | 'document' | 'departments'

const SURFACES: Array<{ key: PreviewSurface; label: string }> = [
  { key: 'home', label: 'Home' },
  { key: 'records', label: 'Records' },
  { key: 'document', label: 'Document' },
  { key: 'departments', label: 'Departments' },
]

type Props = {
  tenantSlug: string
  domainIdentity: { name: string; motto: string; logoUrl: string | null }
  /** Saved V2 banks for every Design (already resolved through each Design's validator). */
  initialBanks: Record<string, StoredDesignBank>
  initialActiveDesign: string
}

/**
 * Shared Site Studio host (P08D-T05). Owns the product chrome — design
 * picker, domain identity, save/revert/reset, dirty tracking, preview
 * surfaces — and mounts the selected Design's OWN Studio editor. The host
 * never inspects config fields and never branches on a Design key; the
 * editors own their vocabularies.
 */
export function SiteStudio({ tenantSlug, domainIdentity, initialBanks, initialActiveDesign }: Props) {
  const router = useRouter()
  const [activeDesign, setActiveDesign] = useState(initialActiveDesign)
  // Sparse drafts: a bank exists here only after the user edits that Design.
  const [drafts, setDrafts] = useState<Record<string, StoredDesignBank>>({})
  const [saved, setSaved] = useState<Record<string, StoredDesignBank>>(initialBanks)
  const [mobile, setMobile] = useState(false)
  const [surface, setSurface] = useState<PreviewSurface>('home')
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [statusText, setStatusText] = useState('')
  const [logo, setLogo] = useState(domainIdentity.logoUrl)

  const design = resolveDesign(activeDesign)
  const draftBank = drafts[activeDesign] ?? saved[activeDesign] ?? { version: design.config.version, config: design.config.defaults }
  const dirtyDesigns = DESIGN_KEYS.filter((key) => {
    const draft = drafts[key]
    if (!draft) return false
    const baseline = saved[key] ?? { version: design.config.version, config: design.config.defaults }
    return JSON.stringify(draft.config) !== JSON.stringify(baseline.config)
  })

  function selectDesign(key: string) {
    const next = resolveDesign(key)
    setActiveDesign(next.key)
    setStatus('idle')
    setStatusText('')
  }

  function updateDraft(next: object) {
    setDrafts((current) => ({
      ...current,
      [activeDesign]: { version: design.config.version, config: next },
    }))
    setStatus('idle')
    setStatusText('')
  }

  function revertActive() {
    setDrafts((current) => {
      const without = { ...current }
      delete without[activeDesign]
      return without
    })
    setStatus('idle')
    setStatusText('')
  }

  function resetActiveToDefaults() {
    setDrafts((current) => ({
      ...current,
      [activeDesign]: { version: design.config.version, config: design.config.defaults },
    }))
    setStatus('idle')
    setStatusText('')
  }

  function onSave() {
    if (pending) return
    setStatus('idle')
    setStatusText('')
    // Persist the active key ALWAYS (switching Design is itself a change) plus
    // every dirty bank. The action re-validates each bank server-side.
    const banks: Record<string, { version: number; config: unknown }> = {}
    for (const key of dirtyDesigns) {
      const draft = drafts[key]
      if (draft) banks[key] = draft
    }
    startTransition(async () => {
      try {
        const result = await saveSiteDesignAction({ tenantSlug, activeDesign, banks })
        if (result.ok) {
          // Drafts collapse into the saved set; display resolves from saved.
          setSaved((current) => ({ ...current, ...banks }))
          setDrafts({})
          setStatus('saved')
          setStatusText('')
          router.refresh()
        } else {
          setStatus('error')
          setStatusText(result.errors?.[0] ?? 'Save failed — retry.')
        }
      } catch {
        setStatus('error')
        setStatusText('Save failed — retry.')
      }
    })
  }

  async function uploadAsset(file: File, purpose: string): Promise<{ url: string }> {
    const fd = new FormData()
    fd.set('tenantSlug', tenantSlug)
    fd.set('purpose', purpose)
    fd.set('file', file)
    setStatusText('Uploading image…')
    try {
      const res = await uploadDesignAssetAction(fd)
      if (res.ok && res.ref) {
        setStatusText('')
        return res.ref
      }
      setStatusText(res.error ?? 'Upload failed — retry.')
      throw new Error(res.error ?? 'Upload failed')
    } catch (error) {
      setStatusText('Upload failed — retry.')
      throw error
    }
  }

  function onLogoUpload(file: File | null) {
    const fd = new FormData()
    fd.set('tenantSlug', tenantSlug)
    fd.set('kind', 'logo')
    if (file) fd.set('file', file)
    setStatusText('Uploading logo…')
    startTransition(async () => {
      try {
        const res = await uploadThemeAssetAction(fd)
        if (res.ok && res.url) {
          setLogo(res.url)
          setStatusText('')
        } else {
          setStatusText(res.error ?? 'Upload failed — retry.')
        }
      } catch {
        setStatusText('Upload failed — retry.')
      }
    })
  }

  // Preview derives tokens from the CURRENT DRAFT of the selected Design
  // through that Design's own resolveTheme (G13). React Compiler owns the
  // memoization; the derivation is pure in (design key, draft config).
  const designKey = design.key
  const previewTheme = designPreviewTheme(designKey, draftBank.config)
  const previewShell = useMemo(() => ({
    ...SHELL_PREVIEW_MODEL,
    domain: { ...SHELL_PREVIEW_MODEL.domain, name: domainIdentity.name, motto: domainIdentity.motto, logoUrl: logo },
  }), [domainIdentity.name, domainIdentity.motto, logo])
  const previewHome = useMemo(() => ({
    ...HOME_PREVIEW_MODEL,
    domain: { name: domainIdentity.name, motto: domainIdentity.motto },
  }), [domainIdentity.name, domainIdentity.motto])

  const Editor = design.studio.Editor
  const Shell = design.Shell
  const HomeView = design.pages.home
  const RecordsView = design.pages.records
  const DocumentView = design.pages.document
  const DepartmentsView = design.pages.departments
  const previewNoop = useMemo(() => async () => {}, [])

  return (
    <div className={styles.studio} data-site-studio>
      <div className={styles.controls}>
        <div className={styles.controlsHead}>
          <h2 className={styles.sectionTitle}>Customize this Domain</h2>
          <p className={styles.helpText}>
            Choose a design, then shape it with that design&rsquo;s own tools. Every change previews live.
          </p>
        </div>

        <section className={styles.panel} aria-labelledby="design-picker-title">
          <h3 id="design-picker-title" className={styles.groupTitle}>Design</h3>
          <div className={styles.templateGrid}>
            {DESIGN_KEYS.map((key) => {
              const option = resolveDesign(key)
              const active = activeDesign === key
              const dirty = dirtyDesigns.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  className={active ? `${styles.templateCard} ${styles.templateCardActive}` : styles.templateCard}
                  onClick={() => selectDesign(key)}
                  aria-pressed={active}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.templateThumb} src={option.preview.thumbnail} alt="" />
                  <span className={styles.templateName}>
                    {option.name}
                    {dirty ? <span className={styles.dirtyBadge} title="Unsaved changes">unsaved</span> : null}
                  </span>
                  <span className={styles.templateDesc}>{option.description}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="identity-title">
          <h3 id="identity-title" className={styles.groupTitle}>Domain identity</h3>
          <label className={styles.field}>
            <span className={styles.label}>Seal or logo</span>
            <div className={styles.logoRow}>
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.logoPreview} src={logo} alt="Domain logo preview" />
              ) : null}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                aria-label="Upload Domain seal or logo"
                onChange={(event) => onLogoUpload(event.target.files?.[0] ?? null)}
              />
            </div>
          </label>
        </section>

        <section className={styles.panel} aria-labelledby="design-controls-title">
          <h3 id="design-controls-title" className={styles.groupTitle}>{design.name} settings</h3>
          <Editor
            value={draftBank.config as object}
            onChange={updateDraft}
            domain={{ name: domainIdentity.name, motto: domainIdentity.motto, logoUrl: logo }}
            uploadAsset={uploadAsset}
          />
        </section>

        <div className={styles.saveRow}>
          <span className={styles.status} aria-live="polite">
            {pending ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? statusText : statusText}
          </span>
          <div className={styles.saveButtons}>
            <button type="button" className={styles.resetButton} onClick={resetActiveToDefaults} disabled={pending}>
              Restore {design.name} defaults
            </button>
            <button type="button" className={styles.resetButton} onClick={revertActive} disabled={pending || dirtyDesigns.length === 0}>
              Revert unsaved
            </button>
            <button className={styles.saveButton} onClick={onSave} disabled={pending}>
              Save changes
            </button>
          </div>
        </div>
      </div>

      <div className={styles.preview}>
        <div className={styles.previewHead}>
          <h2 className={styles.sectionTitle}>Live preview</h2>
          <div className={styles.previewTools}>
            {SURFACES.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={surface === item.key}
                onClick={() => setSurface(item.key)}
              >
                {item.label}
              </button>
            ))}
            <button type="button" aria-pressed={mobile} onClick={() => setMobile(!mobile)}>{mobile ? 'Mobile' : 'Desktop'}</button>
          </div>
        </div>
        <PreviewViewport mobile={mobile}>
          {/* OBSIDIAN-T02: the preview passes the DRAFT config so per-keystroke
              Studio edits render before Save; saved config is never substituted. */}
          <Shell model={previewShell} theme={previewTheme} designConfig={draftBank.config as object}>
            {surface === 'home' ? <HomeView {...previewHome} headerLayout={previewTheme.headerLayout} documentStyle={previewTheme.documentStyle} designConfig={draftBank.config as object} />
              : surface === 'records' ? <RecordsView {...RECORDS_PREVIEW_MODEL} designConfig={draftBank.config as object} />
              : surface === 'document' ? <DocumentView {...DOCUMENT_PREVIEW_MODEL} workflowAction={previewNoop} deleteAction={previewNoop} headerLayout={previewTheme.headerLayout} documentStyle={previewTheme.documentStyle} designConfig={draftBank.config as object} />
              : <DepartmentsView {...DEPARTMENTS_PREVIEW_MODEL} headerLayout={previewTheme.headerLayout} documentStyle={previewTheme.documentStyle} designConfig={draftBank.config as object} />}
          </Shell>
        </PreviewViewport>
      </div>
    </div>
  )
}