import type { Metadata } from 'next'
import React from 'react'

import './custom.scss'

export const metadata: Metadata = {
  title: 'Loreforge',
  description:
    'A crafted archive for worlds worth remembering.',
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
