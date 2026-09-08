import type { PosterConfigV1 } from '@/lib/design/contracts'
import type { DesignShellProps } from '@/lib/design/types'
import { LegacyShellFrame } from '../shared/legacy-frame'

/** Poster shell (compatibility): cultural-publication composition on the legacy shared frame. */
export function PosterShell({ model, theme, children }: DesignShellProps<PosterConfigV1>) {
  return <LegacyShellFrame design="poster" model={model} cssVars={theme.tokens} headerLayout={theme.headerLayout}>{children}</LegacyShellFrame>
}
