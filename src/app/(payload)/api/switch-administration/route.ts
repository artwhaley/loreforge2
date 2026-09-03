import { NextResponse } from 'next/server'

/** Legacy compatibility endpoint. Administration is no longer an operating mode. */
export async function POST(request: Request) {
  const form = await request.formData()
  const slug = String(form.get('domainSlug') ?? '')
  return NextResponse.redirect(new URL(slug ? `/domain/${encodeURIComponent(slug)}` : '/', request.url), 303)
}
