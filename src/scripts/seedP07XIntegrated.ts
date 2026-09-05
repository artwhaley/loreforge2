import { getPayload } from 'payload'

import config from '@/payload.config'
import { seedP07XIntegrated } from '@/seed/p07xIntegrated'

if (process.env.NODE_ENV === 'production') throw new Error('P07X integrated fixtures must not run in production.')

const payload = await getPayload({ config })
const fixture = await seedP07XIntegrated(payload)
console.log(JSON.stringify(fixture, null, 2))
process.exit(0)
