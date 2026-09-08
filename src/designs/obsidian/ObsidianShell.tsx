import Link from "next/link";
import { ArrowUpRight, Settings2 } from "lucide-react";
import type { DesignShellProps } from "@/lib/design/types";
import { OperatingContext } from "@/components/platform/OperatingContext";
import { Navigation } from "./Navigation";
import { ActionMenu } from "./controls";
import {
  resolveObsidianTokens,
} from "./config";
import type { ObsidianConfigV1 } from "@/lib/design/contracts";
import s from "./obsidian.module.css";

/** OperatingContext is a required slot; integration mounts the core component once. */
export function ObsidianShell({ model, theme, designConfig, children }: DesignShellProps<ObsidianConfigV1>) {
  const designVars = resolveObsidianTokens(designConfig)
  return (
    <div className={s.root} data-template="obsidian" style={{ ...theme.tokens, ...designVars }}>
      <a href="#main-content" className={s.skip}>
        Skip to content
      </a>
      <div className={s.contextBar}>
        <OperatingContext model={model} tone="obsidian" />
      </div>
      <div className={s.navPosition}>
        <Navigation model={model} />
      </div>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className={s.footer}>
        <div>
          <span className={s.footerMark}>◈</span> {model.domain.name}
          <span className={s.footerMotto}>{model.domain.motto}</span>
        </div>
        <div className={s.footerLinks}>
          {model.managementNavigation.length > 0 && (
            <ActionMenu
              label="Manage domain"
              trigger={
                <>
                  <Settings2 size={15} />
                  Manage domain
                </>
              }
              items={model.managementNavigation.map((item) => ({
                key: item.segment,
                label: item.label,
                href: item.href,
              }))}
            />
          )}
          <Link href="/">
            LoreForge dashboard <ArrowUpRight size={14} />
          </Link>
        </div>
      </footer>
    </div>
  );
}
