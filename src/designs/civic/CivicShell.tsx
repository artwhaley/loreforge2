import type { DesignShellProps } from '@/lib/design/types'
import { ShellFrame } from '../shared/frame'

/** Civic shell: classic institutional composition around the shared frame skeleton. */
export function CivicShell({ model, theme, children }: DesignShellProps) {
  return <ShellFrame design="civic" model={model} cssVars={theme.tokens} headerLayout={theme.headerLayout}>{children}</ShellFrame>
}
