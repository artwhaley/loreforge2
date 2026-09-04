'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers.js'
import { redirect } from 'next/navigation'

import { getPayload } from 'payload'

import config from '@/payload.config'

import { generateDocumentFromSubmission, type FormAnswers } from '@/lib/forms/generateDocument'
import { assertFormSchema, type FormFieldType } from '@/lib/forms/schema'
import { getActiveContext } from '@/lib/tenant/activeTenant'

export type FormSubmitState = {
  ok: boolean
  message?: string
  missingFields?: string[]
}

/** A serialized form-field block safe to pass to the client fill form. */
export type FillField = {
  type: FormFieldType
  key: string
  label: string
  required: boolean
  options?: Array<{ label: string; value: string }>
  help?: string
}

/**
 * Submit answers to a structured report form.
 *
 * Re-verifies session membership of the tenant server-side, enforces required
 * fields, then delegates to the single generation seam module. On success the
 * user lands on the generated, fully ordinary document.
 */
export async function submitReportFormAction(
  _prev: FormSubmitState | null,
  formData: FormData,
): Promise<FormSubmitState> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const formId = Number(formData.get('formId'))
  if (!tenantSlug || !formId) redirect('/admin/login')

  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })
  if (!user) redirect('/admin/login')

  const tenants = await payload.find({
    collection: 'domains',
    where: { slug: { equals: tenantSlug } },
    depth: 0,
    limit: 1,
  })
  const tenant = tenants.docs[0]
  if (!tenant) return { ok: false, message: 'Unknown tenant.' }

  const memberships = await payload.find({
    collection: 'memberships',
    where: { and: [{ user: { equals: user.id } }, { tenant: { equals: tenant.id } }] },
    depth: 0,
    limit: 1,
  })
  if (!memberships.docs[0]) return { ok: false, message: 'Not authorized.' }

  // Form submissions are document authoring too. An acting Character is
  // optional; when selected, it becomes the visible Prepared by credit.
  const activeContext = await getActiveContext()
  const activeCharacterId = activeContext.tenant?.slug === tenantSlug ? activeContext.activeCharacter?.id : undefined

  // The Template itself must belong to the active Domain. Legacy plugin Forms
  // are intentionally no longer a customer-facing submission surface.
  const forms = await payload.find({
    collection: 'templates',
    where: { and: [{ domain: { equals: tenant.id } }, { id: { equals: formId } }, { kind: { equals: 'form' } }, { active: { equals: true } }] },
    depth: 1,
    limit: 1,
  })
  const form = forms.docs[0]
  if (!form) return { ok: false, message: 'Form not found.' }

  const schema = assertFormSchema(form.formSchema)

  // Collect answers from the form's own field definitions (not raw formData —
  // only declared fields are read) and enforce required validation.
  const answers: FormAnswers = {}
  const missingFields: string[] = []
  for (const field of schema.fields) {
    if (field.type === 'checkbox') {
      answers[field.key] = formData.get(field.key) !== null
      continue
    }
    const raw = String(formData.get(field.key) ?? '').trim()
    if (field.required && !raw) {
      missingFields.push(field.label ?? field.key)
      continue
    }
    answers[field.key] = raw
  }
  if (missingFields.length > 0) {
    return { ok: false, message: 'Required fields are missing.', missingFields }
  }

  const folderValue = form.destinationFolder
  const result = await generateDocumentFromSubmission({
    payload,
    tenant: { id: Number(tenant.id), slug: tenant.slug },
    user: { id: Number(user.id) },
    actorCharacterId: activeCharacterId == null ? undefined : Number(activeCharacterId),
    form: {
      id: form.id,
      name: form.name,
      kind: 'form',
      titleTemplate: form.titleTemplate,
      bodyTemplate: form.bodyTemplate,
      formSchema: schema,
      destinationFolder: folderValue == null ? null : Number(typeof folderValue === 'object' ? folderValue.id : folderValue),
      documentType: typeof form.documentType === 'object' ? form.documentType.id : form.documentType,
      lifecyclePolicy: form.lifecyclePolicy,
    },
    answers,
  })

  revalidatePath(`/domain/${tenantSlug}/records`)
  redirect(`/domain/${tenantSlug}/documents/${result.id}`)
}
