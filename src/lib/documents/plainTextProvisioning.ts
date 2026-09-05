import type { Payload } from 'payload'

type Options = { transactionID?: number | string | null }
const txReq = (options?: Options) => options?.transactionID == null ? undefined : { transactionID: options.transactionID }

export const PLAIN_TEXT_TYPE_NAME = 'Plain Text'

/**
 * Upsert the Domain's single active Plain Text Document Type. Record creation
 * hard-requires one (archive + forms), so every active Domain must carry one:
 * the seed provisions it for seeded Domains and the bootstrap approval path
 * calls this for customer-activated Domains. Idempotent.
 */
export async function ensurePlainTextDocumentType(payload: Payload, domainId: number | string, options?: Options): Promise<number> {
  const req = txReq(options)
  const existing = await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: domainId } }, { name: { equals: PLAIN_TEXT_TYPE_NAME } }] }, depth: 0, limit: 1, overrideAccess: true, req })
  const row = existing.docs[0] as { id: number | string; active?: unknown } | undefined
  if (row) {
    if (row.active === false) await payload.update({ collection: 'document-types', id: row.id, overrideAccess: true, req, data: { active: true } as never })
    return Number(row.id)
  }
  const created = await payload.create({
    collection: 'document-types',
    overrideAccess: true,
    req,
    data: {
      domain: domainId,
      name: PLAIN_TEXT_TYPE_NAME,
      description: 'A freeform Markdown record.',
      active: true,
      allowBlank: true,
      allowTemplate: true,
      allowForm: false,
      defaultFilingPolicy: 'direct-file',
      templateFilingPolicy: 'inherit',
    } as never,
  })
  return Number(created.id)
}