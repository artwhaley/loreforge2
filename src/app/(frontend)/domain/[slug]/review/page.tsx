import { redirect } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

/**
 * Compatibility route (Bible §15/§27): `/review` is legacy-external and
 * delegates to the Work surface — the Work Page Model is the single
 * authorized projection of submitted-record review. A Design never sees a
 * second review contract; the Lab models this as `compat.review → work`.
 */
export default async function ReviewCompatibilityPage({ params }: Props) {
  const { slug } = await params
  const { tenant } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug) redirect('/account')
  redirect(`/domain/${tenant.slug}/work`)
}