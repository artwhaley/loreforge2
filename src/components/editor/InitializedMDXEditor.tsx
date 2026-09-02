'use client'

import '@mdxeditor/editor/style.css'

import type { ForwardedRef } from 'react'
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  type MDXEditorMethods,
  type MDXEditorProps,
  headingsPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from '@mdxeditor/editor'

// Small, intentionally-scoped WYSIWYG toolbar: only the supported Archive
// Markdown features. NOTE: we deliberately do NOT include `diffSourcePlugin` /
// `DiffSourceToggleWrapper` here — MDXEditor's built-in source pane re-serializes
// markdown and collapses blank lines between block elements (headings merge).
// Source editing is provided by our own plain textarea (see DocumentEditor),
// which preserves the canonical Markdown verbatim.
const plugins = [
  headingsPlugin(),
  listsPlugin(),
  quotePlugin(),
  thematicBreakPlugin(),
  markdownShortcutPlugin(),
  linkPlugin(),
  tablePlugin(),
  toolbarPlugin({
    toolbarContents: () => (
      <>
        <UndoRedo />
        <Separator />
        <BoldItalicUnderlineToggles options={['Bold', 'Italic']} />
        <Separator />
        <BlockTypeSelect />
        <Separator />
        <ListsToggle />
        <Separator />
        <CreateLink />
        <Separator />
        <InsertThematicBreak />
        <Separator />
        <InsertTable />
      </>
    ),
  }),
]

export default function InitializedMDXEditor({
  editorRef,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  return <MDXEditor plugins={plugins} {...props} ref={editorRef} />
}
