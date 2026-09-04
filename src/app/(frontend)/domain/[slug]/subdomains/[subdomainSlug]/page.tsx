import { redirect } from 'next/navigation'

type Props = { params: Promise<{ slug: string; subdomainSlug: string }> }
export const dynamic = 'force-dynamic'

export default async function SubdomainLandingPage({ params }: Props) {
  const { slug, subdomainSlug } = await params
  redirect(`/domain/${encodeURIComponent(slug)}/departments/${encodeURIComponent(subdomainSlug)}`)
}
