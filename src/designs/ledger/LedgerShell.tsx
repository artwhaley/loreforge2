import type { DesignShellProps } from '@/lib/design/types'
import { ShellFrame } from '../shared/frame'

/** Ledger shell: editorial archive composition around the same safe model. */
export function LedgerShell({ model, theme, children }: DesignShellProps) {
  return <ShellFrame design="ledger" model={model} cssVars={theme.tokens} headerLayout={theme.headerLayout}>{children}</ShellFrame>
}
