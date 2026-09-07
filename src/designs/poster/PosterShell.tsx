import type { DesignShellProps } from '@/lib/design/types'
import { ShellFrame } from '../shared/frame'

/** Poster shell: cultural-publication composition around the same safe model. */
export function PosterShell({ model, theme, children }: DesignShellProps) {
  return <ShellFrame design="poster" model={model} cssVars={theme.tokens} headerLayout={theme.headerLayout}>{children}</ShellFrame>
}
