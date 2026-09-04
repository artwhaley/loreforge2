import { NextResponse } from 'next/server'

// Document Sharing is deferred by owner decision CC-2026-09-03-04 (see
// LoreForge_Execution_Packet/06_CHANGE_CONTROL.md and the decision brief
// references/P07-D01-DOCUMENT-SHARING-DECISION.md). This route remains
// registered so any existing caller fails cleanly with a stable, controlled
// response, and it performs NO mutation: no Share PermissionRule is created
// or revoked, and the temporary share service is not invoked.

export async function POST() {
  return NextResponse.json(
    { error: 'share_unavailable', message: 'Document sharing is not available (CC-2026-09-03-04).' },
    { status: 403 },
  )
}

export async function GET() {
  return NextResponse.json(
    { error: 'share_unavailable', message: 'Document sharing is not available (CC-2026-09-03-04).' },
    { status: 403 },
  )
}
