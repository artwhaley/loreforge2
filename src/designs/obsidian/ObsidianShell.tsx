import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Settings2 } from "lucide-react";
import type { DomainShellModel } from "@/lib/page-models/shell";
import { Navigation } from "./Navigation";
import { ActionMenu } from "./controls";
import {
  OBSIDIAN_DEFAULTS,
  resolveObsidianTokens,
  type ObsidianConfig,
} from "./config";
import s from "./obsidian.module.css";

/** OperatingContext is a required slot; integration mounts the core component once. */
export function ObsidianShell({
  model,
  active,
  children,
  operatingContext,
  config = OBSIDIAN_DEFAULTS,
}: {
  model: DomainShellModel;
  active: string;
  children: ReactNode;
  operatingContext: ReactNode;
  config?: ObsidianConfig;
}) {
  return (
    <div className={s.root} style={resolveObsidianTokens(config)}>
      <a href="#main-content" className={s.skip}>
        Skip to content
      </a>
      <div className={s.contextBar}>
        <Link href="/" className={s.platform}>
          LOREFORGE <ArrowUpRight size={12} />
        </Link>
        {operatingContext}
      </div>
      <div className={s.navPosition}>
        <Navigation model={model} active={active} />
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
