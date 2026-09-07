import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'

import { pickDesignKey, validateDomainDesignConfig } from '../lib/design/config.js'

function databasePath(uri: string): string {
  if (!uri.startsWith('file:')) throw new Error('Design-registry migration requires a local file: DATABASE_URI.')
  const raw = decodeURIComponent(uri.slice('file:'.length).split('?')[0])
  if (!raw || raw === ':memory:' || /^\/\//.test(raw) || /^[a-z]+:\/\//i.test(raw)) throw new Error('Design-registry migration requires a concrete local SQLite file.')
  return resolve(process.cwd(), raw)
}

const HEX = /^#[0-9a-f]{6}$/i
const cleanColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && HEX.test(value) ? value : fallback
const cleanString = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.length > 0 ? value : fallback

/**
 * Design-registry persistence migration (spec §21 Step 3): backfill the
 * versioned `design_config` JSON for every Domain from its legacy scalar
 * appearance fields. Deterministic and idempotent — rows that already carry
 * a valid config are left untouched, so re-running is a no-op and no Domain
 * visibly changes because the storage representation changed.
 */
const db = new DatabaseSync(databasePath(process.env.DATABASE_URI ?? 'file:./sl-civic-archive.db'))
db.exec('BEGIN IMMEDIATE')
try {
  const columns = new Set((db.prepare('PRAGMA table_info(domains)').all() as Array<{ name: string }>).map((row) => row.name))
  if (columns.size === 0) throw new Error('domains table missing — run against an initialized database.')
  if (!columns.has('design_config')) db.exec('ALTER TABLE domains ADD COLUMN design_config TEXT')
  const rows = db.prepare(
    'SELECT id, slug, design_template, header_layout, document_style, primary_color, secondary_color, accent_color, background_color, heading_font_key, body_font_key, content_width, design_config FROM domains',
  ).all() as Array<Record<string, unknown>>
  const update = db.prepare('UPDATE domains SET design_config = ? WHERE id = ?')
  let written = 0
  let kept = 0
  for (const row of rows) {
    if (validateDomainDesignConfig(typeof row.design_config === 'string' ? JSON.parse(row.design_config as string) : row.design_config) !== null) {
      kept += 1
      continue
    }
    const designKey = pickDesignKey(row.design_template)
    const config = {
      schemaVersion: 1,
      designKey,
      common: {
        primaryColor: cleanColor(row.primary_color, '#243145'),
        secondaryColor: cleanColor(row.secondary_color, '#8A6A3C'),
        accentColor: cleanColor(row.accent_color, '#B9975B'),
        backgroundColor: cleanColor(row.background_color, '#F3EFE6'),
        headingFontKey: cleanString(row.heading_font_key, 'georgia'),
        bodyFontKey: cleanString(row.body_font_key, 'verdana'),
        ...(typeof row.content_width === 'string' && row.content_width.length > 0 ? { contentWidth: row.content_width } : {}),
      },
      options: {
        ...(typeof row.header_layout === 'string' && row.header_layout.length > 0 ? { headerLayout: row.header_layout } : {}),
        ...(typeof row.document_style === 'string' && row.document_style.length > 0 ? { documentStyle: row.document_style } : {}),
      },
      design: {},
    }
    if (validateDomainDesignConfig(config) === null) throw new Error(`Refusing to write an invalid design config for domain ${String(row.slug ?? row.id)}.`)
    update.run(JSON.stringify(config), Number(row.id))
    written += 1
  }
  db.exec('COMMIT')
  console.log(`Design-registry migration complete: ${written} domain config(s) written, ${kept} already valid (left untouched).`)
} catch (error) {
  db.exec('ROLLBACK')
  throw error
} finally { db.close() }
