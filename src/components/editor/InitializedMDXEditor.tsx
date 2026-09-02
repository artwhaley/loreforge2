'use client'

import '@mdxeditor/editor/style.css'

import type { ForwardedRef } from 'react'
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  type MDXEditorMethods,
  type MDXEditorProps,
  diffSourcePlugin,
  headingsPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from '@mdxeditor/editor'

// Small, intentionally-scoped toolbar: only the supported Archive Markdown
// features (spec 2.3 / 7.4). Blockquotes are authored via the `>` shortcut or
// the source view; no arbitrary code blocks, admonitions, or embeds.
const plugins = [
  headingsPlugin(),
  listsPlugin(),
  quotePlugin(),
  thematicBreakPlugin(),
  markdownShortcutPlugin(),
  linkPlugin(),
  tablePlugin(),
  diffSourcePlugin({ viewMode: 'rich-text', diffMarkdown: '' }),
  toolbarPlugin({
    toolbarContents: () => (
      <DiffSourceToggleWrapper>
        <UndoRedo />
        <Separator />
        <BoldItalicUnderlineToggles />
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
      </DiffSourceToggleWrapper>
    ),
  }),
]

export default function InitializedMDXEditor({
  editorRef,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  return <MDXEditor plugins={plugins} {...props} ref={editorRef} />
}
