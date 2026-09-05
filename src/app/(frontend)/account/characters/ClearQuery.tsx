'use client'

import { useEffect } from 'react'

export function ClearQuery() {
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.search) window.history.replaceState(null, '', url.pathname)
  }, [])
  return null
}