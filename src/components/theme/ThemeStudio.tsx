'use client'

import { useMemo, useState, useTransition } from 'react'

import { saveThemeAction } from '@/lib/actions/saveTheme'
import { uploadThemeAssetAction } from '@/lib/actions/uploadThemeAsset'
import {
  FONT_OPTIONS,
  THEME_PRESETS,
  themeTokensToCssVars,
  tokensFromVars,
} from '@/lib/theme/fonts'

import styles from './ThemeStudio.module.scss'

type ThemeState = {
  preset: 'heritage' | 'modern'
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  headingFontKey: string
  bodyFontKey: string
}

type Props = {
  tenantSlug: string
  domainName: string
  motto: string
  initial: ThemeState
  logoUrl: string
  bannerUrl: string
  previewHtml: string
  previewDocTitle: string
  previewMeta: string
}

export function ThemeStudio({
  tenantSlug,
  domainName,
  motto,
  initial,
  logoUrl,
  bannerUrl,
  previewHtml,
  previewDocTitle,
  previewMeta,
}: Props) {
  const [theme, setTheme] = useState<ThemeState>(initial)
  const [logo, setLogo] = useState(logoUrl)
  const [banner, setBanner] = useState(bannerUrl)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [uploadStatus, setUploadStatus] = useState('')

  const tokens = useMemo(
    () =>
      tokensFromVars({
        primary: theme.primaryColor,
        secondary: theme.secondaryColor,
        accent: theme.accentColor,
        backgroundColor: theme.backgroundColor,
        headingFontKey: theme.headingFontKey,
        bodyFontKey: theme.bodyFontKey,
      }),
    [theme],
  )
  const cssVars = themeTokensToCssVars(tokens)

  function applyPreset(preset: ThemeState['preset']) {
    const p = THEME_PRESETS[preset]
    setTheme((prev) => ({
      preset,
      primaryColor: p.primary,
      secondaryColor: p.secondary,
      accentColor: p.accent,
      backgroundColor: p.background,
      headingFontKey: p.headingFontKey,
      bodyFontKey: p.bodyFontKey,
    }))
  }

  function onUpload(kind: 'logo' | 'banner', file: File | null) {
    if (!file) return
    const fd = new FormData()
    fd.set('tenantSlug', tenantSlug)
    fd.set('kind', kind)
    fd.set('file', file)
    setUploadStatus('Uploading…')
    startTransition(async () => {
      try {
        const res = await uploadThemeAssetAction(fd)
        if (res.ok && res.url) {
          if (kind === 'logo') setLogo(res.url)
          else setBanner(res.url)
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
        const result = await saveThemeAction({ tenantSlug, theme })
        setStatus(result.ok ? 'saved' : 'error')
      } catch {
        setStatus('error')
      }
    })
  }

  return (
    <div className={styles.studio}>
      <div className={styles.controls}>
        <h2 className={styles.sectionTitle}>Customize this Domain</h2>
        <p className={styles.helpText}>Choose a visual style for the public home and archive records.</p>

        <label className={styles.field}>
          <span className={styles.label}>Preset</span>
          <select
            className={styles.select}
            value={theme.preset}
            onChange={(e) => applyPreset(e.target.value as ThemeState['preset'])}
          >
            {Object.entries(THEME_PRESETS).map(([key, p]) => (
              <option key={key} value={key}>
                {p.label}
              </option>
            ))}
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

        <h3 className={styles.groupTitle}>Typography</h3>
        <label className={styles.field}>
          <span className={styles.label}>Heading font</span>
          <select
            className={styles.select}
            value={theme.headingFontKey}
            onChange={(e) => setTheme((prev) => ({ ...prev, headingFontKey: e.target.value }))}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Body font</span>
          <select
            className={styles.select}
            value={theme.bodyFontKey}
            onChange={(e) => setTheme((prev) => ({ ...prev, bodyFontKey: e.target.value }))}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

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
            <span className={styles.label}>Header banner image</span>
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
        </div>

        <div className={styles.saveRow}>
          <span className={styles.status} aria-live="polite">
            {pending ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? 'Save failed — retry' : uploadStatus}
          </span>
          <button className={styles.saveButton} onClick={onSave} disabled={pending}>
            Save changes
          </button>
        </div>
      </div>

      <div className={styles.preview}>
        <h2 className={styles.sectionTitle}>Live preview</h2>
        <div className={styles.previewScaffold} style={cssVars as React.CSSProperties}>
          {/* Homepage chrome preview */}
          <div className={styles.siteHeader}>
            <div className={styles.siteHeaderInner}>
              <div className={styles.identity}>
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.seal} src={logo} alt="Seal" />
                ) : (
                  <div className={styles.sealFallback}>{domainName.charAt(0)}</div>
                )}
                <div>
                  <div className={styles.domainName}>{domainName}</div>
                  {motto ? <div className={styles.motto}>{motto}</div> : null}
                </div>
              </div>
              <nav className={styles.nav}>
                <span>Home</span>
                <span>Records</span>
              </nav>
            </div>
            <div className={styles.headRule} />
            {banner ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.banner} src={banner} alt="Banner" />
            ) : null}
          </div>

          {/* Representative archive document preview */}
          <div className={styles.record}>
            <div className={styles.recordTitle}>{previewDocTitle}</div>
            <div className={styles.recordMeta}>{previewMeta}</div>
            <div
              className={styles.recordBody}
              // Server-rendered from canonical Markdown; theme only changes variables.
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
