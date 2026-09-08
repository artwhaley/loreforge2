import { ParitySurface } from '@/components/design-parity/ParitySurface'

export const dynamic = 'force-dynamic'

/** Development-only deterministic render oracle for the Lab parity harness. */
export default function DesignParityHomePage() {
  return <ParitySurface surface="home" />
}
