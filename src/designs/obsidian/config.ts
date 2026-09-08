import type { CSSProperties } from "react";

/** Design-owned values, deliberately no customer-facing editor in pass one. */
export type ObsidianConfig = {
  palette: {
    background: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
  };
  geometry: { contentMax: number; pageGutter: number; surfaceRadius: number };
  records: {
    defaultView: "cards" | "list";
    cardPageSize: 6 | 12 | 24;
    listPageSize: 25 | 50 | 100;
  };
  atmosphereImage: string | null;
};
/**
 * Atmosphere media is a persisted Design asset reference in production
 * (OBSIDIAN-T11 wires `DesignAssetRef`); null renders the CSS/gradient
 * fallback. The incubation's bundled `/obsidian-coastline.png` fixture path
 * is deliberately NOT carried into production defaults.
 */
export const OBSIDIAN_DEFAULTS: ObsidianConfig = {
  palette: {
    background: "#0b1419",
    surface: "#142128",
    text: "#edf2ef",
    muted: "#a7b7bc",
    accent: "#bce6d3",
  },
  geometry: { contentMax: 1440, pageGutter: 56, surfaceRadius: 18 },
  records: { defaultView: "cards", cardPageSize: 6, listPageSize: 50 },
  atmosphereImage: null,
};

export function resolveObsidianTokens(config: ObsidianConfig): CSSProperties {
  return {
    "--obsidian-bg": config.palette.background,
    "--obsidian-surface": config.palette.surface,
    "--obsidian-text": config.palette.text,
    "--obsidian-muted": config.palette.muted,
    "--obsidian-accent": config.palette.accent,
    "--obsidian-max": `${config.geometry.contentMax}px`,
    "--obsidian-gutter": `${config.geometry.pageGutter}px`,
    "--obsidian-radius": `${config.geometry.surfaceRadius}px`,
  } as CSSProperties;
}
