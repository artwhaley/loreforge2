import { getPayload } from 'payload'
import config from '@/payload.config'
import { seedPhase7Acceptance } from '@/seed/phase7Acceptance'

if (process.env.NODE_ENV === 'production') throw new Error('Development fixtures must not run in production.')
const payload = await getPayload({ config })
console.log(JSON.stringify(await seedPhase7Acceptance(payload), null, 2))
process.exit(0)
