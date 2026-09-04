import { redirect } from 'next/navigation'

// Legacy compatibility shim (P05R-T06): /subdomains URLs forward to the
// canonical /departments surface. New work must not import from here.

type Props = { params: Promise<{ slug: string }> }
export const dynamic = 'force-dynamic'

export default async function SubdomainsPage({ params }: Props) {
  const { slug } = await params
  redirect(`/domain/${encodeURIComponent(slug)}/departments`)
}
