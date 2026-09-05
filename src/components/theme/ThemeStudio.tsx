'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { saveThemeAction } from '@/lib/actions/saveTheme'
import { uploadThemeAssetAction } from '@/lib/actions/uploadThemeAsset'
import {
  BACKGROUND_TREATMENT_OPTIONS,
  CONTENT_WIDTH_OPTIONS,
  DESIGN_TEMPLATE_OPTIONS,
  DESIGN_TEMPLATES,
  DOCUMENT_STYLE_OPTIONS,
  FONT_OPTIONS,
  HEADER_LAYOUT_OPTIONS,
  HEADER_LAYOUTS,
  THEME_PRESETS,
  tokensFromVars,
} from '@/lib/theme/fonts'
import { contrastWarnings } from '@/lib/theme/color'

import { DomainFrame } from './DomainFrame'
import { DomainHome, type DomainHomeProps } from './DomainHome'
import { DocumentPaper } from './DocumentPaper'
import { PreviewViewport } from './PreviewViewport'
import documentStyles from '@/app/(frontend)/domain/[slug]/documents/[id]/document.module.scss'
import styles from './ThemeStudio.module.scss'

type ThemeState = {
  preset: keyof typeof THEME_PRESETS
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  headingFontKey: string
  bodyFontKey: string
  designTemplate: string
  contentWidth: string
  headerLayout: string
  documentStyle: string
  backgroundTreatment: string
  backgroundImageSet: boolean
}

type TabKey = 'design' | 'colors' | 'type' | 'images' | 'reading'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'design', label: 'Design' },
  { key: 'colors', label: 'Colors' },
  { key: 'type', label: 'Typography' },
  { key: 'images', label: 'Images' },
  { key: 'reading', label: 'Reading' },
]

type Props = {
  tenantSlug: string
  domainName: string
  motto: string
  initial: ThemeState
  logoUrl: string
  bannerUrl: string
  backgroundUrl: string
  previewHtml: string
  previewDocTitle: string
  previewMeta: string
  home: DomainHomeProps
}

export function ThemeStudio({
  tenantSlug,
  domainName,
  motto,
  initial,
  logoUrl,
  bannerUrl,
  backgroundUrl,
  previewHtml,
  previewDocTitle,
  previewMeta,
  home,
}: Props) {
  const [theme, setTheme] = useState<ThemeState>(initial)
  const [mobile, setMobile] = useState(false)
  const [surface, setSurface] = useState<'home' | 'reading'>('home')
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<TabKey>('design')
  const [logo, setLogo] = useState(logoUrl)
  const [banner, setBanner] = useState(bannerUrl)
  const [background, setBackground] = useState(backgroundUrl)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [uploadStatus, setUploadStatus] = useState('')
  const router = useRouter()

  const tokens = useMemo(
    () =>
      tokensFromVars({
        primary: theme.primaryColor,
        secondary: theme.secondaryColor,
        accent: theme.accentColor,
        backgroundColor: theme.backgroundColor,
        headingFontKey: theme.headingFontKey,
        bodyFontKey: theme.bodyFontKey,
        designTemplate: theme.designTemplate,
        contentWidth: theme.contentWidth,
        headerLayout: theme.headerLayout,
        documentStyle: theme.documentStyle,
        backgroundTreatment: theme.backgroundTreatment,
        backgroundImageSet: Boolean(background),
      }),
    [theme, background],
  )
  const warnings = contrastWarnings({
    primary: theme.primaryColor,
    secondary: theme.secondaryColor,
    accent: theme.accentColor,
    backgroundColor: theme.backgroundColor,
  })

  function applyPreset(preset: ThemeState['preset']) {
    const p = THEME_PRESETS[preset]
    setTheme((prev) => ({
      ...prev,
      preset,
      primaryColor: p.primary,
      secondaryColor: p.secondary,
      accentColor: p.accent,
      backgroundColor: p.background,
      headingFontKey: p.headingFontKey,
      bodyFontKey: p.bodyFontKey,
    }))
  }

  function onUpload(kind: 'logo' | 'banner' | 'background' | 'background-clear', file: File | null) {
    const fd = new FormData()
    fd.set('tenantSlug', tenantSlug)
    fd.set('kind', kind)
    if (file) fd.set('file', file)
    setUploadStatus('Uploading…')
    startTransition(async () => {
      try {
        const res = await uploadThemeAssetAction(fd)
        if (res.ok) {
          if (kind === 'logo') setLogo(res.url ?? '')
          else if (kind === 'banner') setBanner(res.url ?? '')
          else if (kind === 'background') setBackground(res.url ?? '')
          else setBackground('')
          setTheme((prev) => ({ ...prev, backgroundImageSet: kind !== 'background-clear' }))
          setUploadStatus('Image ready')
        } else {
          setUploadStatus(res.error ?? 'Upload failed — retry')
        }
      } catch {
        setUploadStatus('Upload failed — retry')
      }
    })
  }

  function onSave() {
    setStatus('idle')
    startTransition(async () => {
      try {
        // The action re-validates every value at the boundary; the cast only
        // narrows the editor's stringly-typed selects back to their unions.
        const payload = { ...theme } as Parameters<typeof saveThemeAction>[0]['theme']
        const result = await saveThemeAction({ tenantSlug, theme: payload })
        if (result.ok) {
          setStatus('saved')
          // Re-render the whole page immediately so the surrounding Domain
          // shell (header, management nav, colors, frame) reflects the new
          // theme without a manual reload. The studio keeps its draft state.
          router.refresh()
        } else {
          setStatus('error')
        }
      } catch {
        setStatus('error')
      }
    })
  }

  function resetToPreset() {
    applyPreset(theme.preset)
  }

  return (
    <div className={styles.studio} data-theme-studio>
      <div className={styles.controls}>
        <div className={styles.controlsHead}>
          <h2 className={styles.sectionTitle}>Customize this Domain</h2>
          <p className={styles.helpText}>
            Pick a design, then shape it. Every change previews live on the right.
          </p>
        </div>

        <div className={styles.tabRow} role="tablist" aria-label="Theme settings">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              className={tab === item.key ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => { setTab(item.key); if (item.key === 'reading') setSurface('reading') }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'design' ? (
          <div className={styles.tabPanel}>
            <h3 className={styles.groupTitle}>Design template</h3>
            <div className={styles.templateGrid}>
              {DESIGN_TEMPLATE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={theme.designTemplate === option.value ? `${styles.templateCard} ${styles.templateCardActive}` : styles.templateCard}
                  data-template={option.value}
                  onClick={() => setTheme((prev) => ({ ...prev, designTemplate: option.value }))}
                  aria-pressed={theme.designTemplate === option.value}
                >
                  <span className={styles.templateThumb} aria-hidden="true">
                    <span className={styles.thumbHeader} />
                    <span className={styles.thumbRule} />
                    <span className={styles.thumbBlocks}><span /><span /><span /></span>
                  </span>
                  <span className={styles.templateName}>{DESIGN_TEMPLATES[option.value as keyof typeof DESIGN_TEMPLATES].label}</span>
                  <span className={styles.templateDesc}>{DESIGN_TEMPLATES[option.value as keyof typeof DESIGN_TEMPLATES].description}</span>
                </button>
              ))}
            </div>

            <h3 className={styles.groupTitle}>Header &amp; navigation look</h3>
            <div className={styles.headerLayoutGrid}>
              {HEADER_LAYOUT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={theme.headerLayout === option.value ? `${styles.headerCard} ${styles.headerCardActive}` : styles.headerCard}
                  data-layout={option.value}
                  onClick={() => setTheme((prev) => ({ ...prev, headerLayout: option.value }))}
                  aria-pressed={theme.headerLayout === option.value}
                >
                  <span className={styles.headerThumb} aria-hidden="true">
                    {option.value === 'centered' ? (
                      <><span className={styles.thumbDot} /><span className={styles.thumbNavRow}><span /><span /><span /></span></>
                    ) : option.value === 'left-aligned' ? (
                      <><span className={styles.thumbBar}><span className={styles.thumbDot} /><span className={styles.thumbNavRow}><span /><span /><span /></span></span></>
                    ) : (
                      <><span className={styles.thumbHero} /><span className={styles.thumbBar}><span className={styles.thumbDot} /><span className={styles.thumbNavRow}><span /><span /><span /></span></span></>
                    )}
                  </span>
                  <span className={styles.headerName}>{HEADER_LAYOUTS[option.value as keyof typeof HEADER_LAYOUTS].label}</span>
                </button>
              ))}
            </div>

            <h3 className={styles.groupTitle}>Content width</h3>
            <label className={styles.field}>
              <span className={styles.label}>Shell width</span>
              <select
                className={styles.select}
                value={theme.contentWidth}
                onChange={(e) => setTheme((prev) => ({ ...prev, contentWidth: e.target.value }))}
              >
                {CONTENT_WIDTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
        ) : null}

        {tab === 'colors' ? (
          <div className={styles.tabPanel}>
            <h3 className={styles.groupTitle}>Palette</h3>
            <label className={styles.field}>
              <span className={styles.label}>Starting palette</span>
              <select
                className={styles.select}
                value={theme.preset}
                onChange={(e) => applyPreset(e.target.value as ThemeState['preset'])}
              >
                {Object.entries(THEME_PRESETS).map(([key, p]) => <option key={key} value={key}>{p.label}</option>)}
              </select>
            </label>

            <h3 className={styles.groupTitle}>Brand colors</h3>
            <div className={styles.swatches}>
              {(
                [
                  ['Primary', 'primaryColor'],
                  ['Secondary', 'secondaryColor'],
                  ['Accent', 'accentColor'],
                  ['Background', 'backgroundColor'],
                ] as const
              ).map(([label, key]) => (
                <label key={key} className={styles.swatch}>
                  <span className={styles.label}>{label}</span>
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={theme[key]}
                    onChange={(e) => setTheme((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>

            {warnings.length > 0 ? (
              <div className={styles.warningBox} role="status">
                <strong>Readability checks</strong>
                <ul>
                  {warnings.map((warning) => <li key={warning.message}>{warning.message}</li>)}
                </ul>
                <span>These are advisories — you can still save.</span>
              </div>
            ) : null}

            <h3 className={styles.groupTitle}>Background treatment</h3>
            <label className={styles.field}>
              <span className={styles.label}>Treatment</span>
              <select
                className={styles.select}
                value={theme.backgroundTreatment}
                onChange={(e) => setTheme((prev) => ({ ...prev, backgroundTreatment: e.target.value }))}
              >
                {BACKGROUND_TREATMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} disabled={Boolean(o.requiresImage) && !background}>
                    {o.label}
                    {o.requiresImage && !background ? ' (upload an image to use)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {tab === 'type' ? (
          <div className={styles.tabPanel}>
            <h3 className={styles.groupTitle}>Typography</h3>
            <label className={styles.field}>
              <span className={styles.label}>Heading font</span>
              <select
                className={styles.select}
                value={theme.headingFontKey}
                onChange={(e) => setTheme((prev) => ({ ...prev, headingFontKey: e.target.value }))}
              >
                {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Body font</span>
              <select
                className={styles.select}
                value={theme.bodyFontKey}
                onChange={(e) => setTheme((prev) => ({ ...prev, bodyFontKey: e.target.value }))}
              >
                {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </label>
            <div className={styles.typeSpecimen} aria-hidden="true">
              <span className={styles.specimenHeading} style={{ fontFamily: tokens.headingFont }}>The Domain Ledger</span>
              <span className={styles.specimenBody} style={{ fontFamily: tokens.bodyFont }}>
                Records hold the memory of a world: filed, versioned, and kept.
              </span>
            </div>
          </div>
        ) : null}

        {tab === 'images' ? (
          <div className={styles.tabPanel}>
            <h3 className={styles.groupTitle}>Brand images</h3>
            <div className={styles.uploads}>
              <label className={styles.field}>
                <span className={styles.label}>Domain seal or logo</span>
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.logoPreview} src={logo} alt="Logo preview" />
                ) : null}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  aria-label="Upload Domain seal or logo"
                  onChange={(e) => onUpload('logo', e.target.files?.[0] ?? null)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Header banner image (used by the Banner hero layout)</span>
                {banner ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.bannerPreview} src={banner} alt="Banner preview" />
                ) : null}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  aria-label="Upload header banner image"
                  onChange={(e) => onUpload('banner', e.target.files?.[0] ?? null)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Page background (shows behind everything)</span>
                {background ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.backgroundPreview} src={background} alt="Background preview" />
                ) : null}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  aria-label="Upload page background image"
                  onChange={(e) => onUpload('background', e.target.files?.[0] ?? null)}
                />
                {background ? (
                  <button type="button" className={styles.clearButton} onClick={() => onUpload('background-clear', null)}>
                    Remove background
                  </button>
                ) : null}
              </label>
            </div>
          </div>
        ) : null}

        {tab === 'reading' ? (
          <div className={styles.tabPanel}>
            <h3 className={styles.groupTitle}>Document reading style</h3>
            <div className={styles.docStyleGrid}>
              {DOCUMENT_STYLE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={theme.documentStyle === o.value ? `${styles.docStyleCard} ${styles.docStyleCardActive}` : styles.docStyleCard}
                  data-style={o.value}
                  onClick={() => setTheme((prev) => ({ ...prev, documentStyle: o.value }))}
                  aria-pressed={theme.documentStyle === o.value}
                >
                  <span className={styles.docStyleLabel}>{o.label}</span>
                  <span className={styles.docStyleSpecimen} data-style={o.value}>
                    <span className={styles.specimenTitle} data-style={o.value} style={{ fontFamily: o.value === 'classic' ? tokens.headingFont : tokens.bodyFont }}>{previewDocTitle || 'A Filed Record'}</span>
                    <span className={styles.specimenMeta} data-style={o.value}>{previewMeta || 'Filed · Web'}</span>
                    <span className={styles.specimenExcerpt} data-style={o.value} style={{ fontFamily: o.value === 'classic' ? tokens.headingFont : tokens.bodyFont }}>
                      The clerk ruled a fresh line and copied the incident as spoken.
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <p className={styles.helpText}>
              Classic keeps the serif record-sheet: bordered headings, tinted quotes, a heavy top rule.
              Modern reads like a clean article: open sans headings, airy lines, plain pull quotes.
            </p>
          </div>
        ) : null}

        <div className={styles.saveRow}>
          <span className={styles.status} aria-live="polite">
            {pending ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? 'Save failed — retry' : uploadStatus}
          </span>
          <div className={styles.saveButtons}>
            <button type="button" className={styles.resetButton} onClick={resetToPreset} disabled={pending}>
              Reset to palette
            </button>
            <button className={styles.saveButton} onClick={onSave} disabled={pending}>
              Save changes
            </button>
          </div>
        </div>
      </div>

      <div className={expanded ? `${styles.preview} ${styles.previewExpanded}` : styles.preview}>
        <div className={styles.previewHead}>
          <h2 className={styles.sectionTitle}>Live preview</h2>
          <div className={styles.previewTools}>
            <button type="button" aria-pressed={surface === 'home'} onClick={() => setSurface('home')}>Home</button>
            <button type="button" aria-pressed={surface === 'reading'} onClick={() => setSurface('reading')}>Reading</button>
            <button type="button" aria-pressed={mobile} onClick={() => setMobile(!mobile)}>{mobile ? 'Mobile' : 'Desktop'}</button>
            <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Close expanded preview' : 'Expand preview'}</button>
          </div>
        </div>
        <PreviewViewport mobile={mobile}>
          <DomainFrame name={domainName} motto={motto} base={home.base} logo={logo} banner={banner} background={background} tokens={tokens}>
            {surface === 'home' ? <DomainHome {...home} editHref={undefined} /> :
              <article className={documentStyles.record} data-style={theme.documentStyle}>
                <DocumentPaper title={previewDocTitle || 'No record yet'} meta={previewMeta} html={previewHtml} />
              </article>}
          </DomainFrame>
        </PreviewViewport>
      </div>
    </div>
  )
}
