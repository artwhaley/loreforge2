// Preview theme derivation (P08D-T05). Pure and client-safe: given a Design
// key and a DRAFT config, resolve the Design's own theme + the legacy variant
// projection the current Shells/pages still consume. The SiteStudio host uses
// this so its memo depends only on primitives (design key + config identity),
// never on the erased Design definition object.
import { resolveDesign } from './registry'
import { legacyVariantProjection } from './resolveDomainDesign'
import { serializeDesignTheme } from './themeTokens'

export type PreviewTheme = {
  tokens: Record<string, string>
  headerLayout: string
  documentStyle: string
}

export function designPreviewTheme(designKey: string, config: unknown): PreviewTheme {
  const design = resolveDesign(designKey)
  const theme = design.config.resolveTheme(config as Parameters<typeof design.config.resolveTheme>[0])
  const variant = legacyVariantProjection(design, config)
  return {
    tokens: serializeDesignTheme(theme),
    headerLayout: variant.headerLayout,
    documentStyle: variant.documentStyle,
  }
}