import type { Metadata } from 'next'
import React from 'react'

import './custom.scss'

export const metadata: Metadata = {
  title: 'SL Civic Archive',
  description:
    'Local proof of concept: civic records archive for Second Life roleplay communities.',
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
