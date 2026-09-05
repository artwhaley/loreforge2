'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** A real viewport isolates draft styles and makes responsive CSS truthful. */
export function PreviewViewport({ children, mobile }: { children: ReactNode; mobile: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const [frameDocument, setFrameDocument] = useState<Document | null>(null)
  const [available, setAvailable] = useState(600)
  const width = mobile ? 390 : 1280
  const scale = Math.min(1, available / width)

  useEffect(() => {
    if (!host.current) return
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width))
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [])

  // A srcDoc iframe can finish loading before hydration attaches onLoad, so
  // adopt an already-complete document on mount; later loads still fire onLoad.
  useEffect(() => {
    const frame = host.current?.querySelector('iframe')
    if (frame?.contentDocument?.readyState === 'complete' && frameDocument !== frame.contentDocument) {
      setFrameDocument(frame.contentDocument)
    }
  }, [frameDocument])

  useEffect(() => {
    if (!frameDocument) return
    const sync = () => {
      frameDocument.head.querySelectorAll('[data-preview-style]').forEach(node => node.remove())
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
        const clone = node.cloneNode(true) as HTMLElement
        clone.setAttribute('data-preview-style', '')
        frameDocument.head.appendChild(clone)
      })
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.head, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [frameDocument])

  return <div ref={host} style={{ width: '100%', minWidth: 0 }}>
    <div style={{ height: 900 * scale, width: width * scale, margin: 'auto', overflow: 'hidden', border: '1px solid #d5d9df', background: '#fff' }}>
      <iframe title={mobile ? 'Domain preview — mobile' : 'Domain preview — desktop'}
        srcDoc={'<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="preview-root"></div></body></html>'}
        onLoad={event => setFrameDocument(event.currentTarget.contentDocument)}
        style={{ border: 0, width, height: 900, transform: `scale(${scale})`, transformOrigin: 'top left', display: 'block' }} />
    </div>
    {frameDocument?.getElementById('preview-root') ? createPortal(
      <div onClick={event => { if ((event.target as HTMLElement).closest('a')) event.preventDefault() }}>{children}</div>,
      frameDocument.getElementById('preview-root')!,
    ) : null}
  </div>
}
