import React from 'react'

// Pass-through root layout: each route group owns its own <html>/<body> so the
// Payload admin and the site chrome don't nest document tags.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
