import { ParitySurface } from '@/components/design-parity/ParitySurface'

export const dynamic = 'force-dynamic'

export default async function DesignParitySurfacePage({ params }: { params: Promise<{ surface: string }> }) {
  const { surface } = await params
  return <ParitySurface surface={surface} />
}
