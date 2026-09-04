'use client'

import { autoTitleTemplate, headingText } from '@/lib/forms/layout'
import type { LoreForgeFormField } from '@/lib/forms/schema'

import styles from './FormStudio.module.scss'

function sampleAnswer(field: LoreForgeFormField): string {
  if (field.type === 'select') return field.options?.[0]?.label ?? 'A choice'
  if (field.type === 'checkbox') return field.default === true ? 'Yes' : 'No'
  if (field.type === 'character') return 'A Character from this Domain'
  if (field.type === 'date') return '2026-09-04'
  if (field.type === 'textarea') return 'Sample long answer that runs over a couple of lines.'
  return 'Sample answer'
}

type Props = {
  name: string
  fields: LoreForgeFormField[]
  recordNameKey: string | null
  baseTemplateName: string | null
}

/**
 * What the filer's finished record will look like, rendered directly from the
 * same auto-layout rules the server saves — with sample answers standing in
 * for what a real person types.
 */
export function RecordPreview({ name, fields, recordNameKey, baseTemplateName }: Props) {
  const titleTemplate = autoTitleTemplate(fields, recordNameKey)
  const namingField = titleTemplate ? fields.find((field) => `{{${field.key}}}` === titleTemplate) : undefined
  const title = namingField ? sampleAnswer(namingField) : name
  return (
    <div className={styles.previewPane} aria-label="Record preview">
      <p className={styles.recordNote}>
        This is what the finished record looks like with sample answers. Fliers&apos; real answers appear in the same places.
        {baseTemplateName ? ` The record is wrapped by the “${baseTemplateName}” template.` : null}
      </p>
      <div className={styles.recordCard}>
        <h2 className={styles.recordTitle}>{title}</h2>
        {fields.map((field, index) => (
          <section className={styles.recordSection} key={field.key}>
            <h3 className={styles.recordHeading}>{headingText(field.label || `Question ${index + 1}`)}</h3>
            <p className={styles.recordValue}>{sampleAnswer(field)}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
