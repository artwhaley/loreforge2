"use client";
import { Tabs } from "radix-ui";
import { BookOpen, Code2 } from "lucide-react";
import type { ReactNode } from "react";
import s from "./obsidian.module.css";
export function ReadingSurface({
  source,
  children,
}: {
  source: string | null;
  children: ReactNode;
}) {
  return (
    <Tabs.Root defaultValue="document">
      <div className={s.readingToolbar}>
        <Tabs.List className={s.readingTabs} aria-label="Document view">
          <Tabs.Trigger value="document">
            <BookOpen size={15} />
            Document
          </Tabs.Trigger>
          {source !== null && (
            <Tabs.Trigger value="source">
              <Code2 size={15} />
              Source
            </Tabs.Trigger>
          )}
        </Tabs.List>
        <span className={s.readingLabel}>THE DOMAIN RECORD</span>
      </div>
      <Tabs.Content value="document" className={s.readingPanel} forceMount>
        {children}
      </Tabs.Content>
      {source !== null && (
        <Tabs.Content value="source" className={s.sourcePanel} forceMount>
          <pre>{source}</pre>
        </Tabs.Content>
      )}
    </Tabs.Root>
  );
}
