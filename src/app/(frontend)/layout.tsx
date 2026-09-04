import type { Metadata } from 'next'
import { Lato, Newsreader } from 'next/font/google'
import React from 'react'

import './custom.scss'

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  display: 'swap',
  variable: '--font-body',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'Loreforge',
  description:
    'A crafted archive for worlds worth remembering.',
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lato.variable} ${newsreader.variable}`}>
      <body>{children}</body>
    </html>
  )
}
