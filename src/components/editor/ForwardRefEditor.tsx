'use client'

import dynamic from 'next/dynamic'
import { forwardRef } from 'react'

import type { MDXEditorMethods, MDXEditorProps } from '@mdxeditor/editor'

// The only place InitializedMDXEditor is imported directly (dynamic requires it).
const Editor = dynamic(() => import('./InitializedMDXEditor'), {
  // MDXEditor does not support server rendering.
  ssr: false,
})

// Pre-initialized with plugins, ready to accept other props including a ref.
export const ForwardRefEditor = forwardRef<MDXEditorMethods, MDXEditorProps>(
  (props, ref) => <Editor {...props} editorRef={ref} />,
)

ForwardRefEditor.displayName = 'ForwardRefEditor'
