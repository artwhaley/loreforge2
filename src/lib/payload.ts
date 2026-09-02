import { getPayload } from 'payload'

import config from '@/payload.config'

let payloadPromise: ReturnType<typeof getPayload> | null = null

/** Share one initialized Payload instance across a server render/request. */
export function getLorePayload() {
  if (!payloadPromise) payloadPromise = getPayload({ config })
  return payloadPromise
}
