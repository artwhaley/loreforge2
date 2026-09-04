import { redirect } from 'next/navigation'

// Legacy compatibility shim (P05R-T06): /subdomains URLs forward to the
// canonical /departments surface. New work must not import from here.

type Props = { params: Promise<{ slug: string; subdomainSlug: string }> }
export const dynamic = 'force-dynamic'

export default async function SubdomainLandingPage({ params }: Props) {
  const { slug, subdomainSlug } = await params
  redirect(`/domain/${encodeURIComponent(slug)}/departments/${encodeURIComponent(subdomainSlug)}`)
}
