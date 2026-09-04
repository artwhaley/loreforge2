import { redirect } from 'next/navigation'

type Props = { params: Promise<{ slug: string; id: string }> }

// Legacy compatibility shim (P05R-T06): /tenant/* customer URLs forward to
// the canonical /domain/* surface. New work must not import from here.
export default async function LegacyTenantRedirect({ params }: Props) {
  const values = await params
  redirect(`/domain/${values.slug}/documents/${values.id}/history`)
}
