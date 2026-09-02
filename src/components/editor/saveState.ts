export type SaveSnapshot = {
  title: string
  body: string
}

export type SaveStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error'

export type SaveState = {
  baseline: SaveSnapshot
  current: SaveSnapshot
  pending: boolean
  status: SaveStatus
  requestId: number
}

export function snapshotsEqual(left: SaveSnapshot, right: SaveSnapshot): boolean {
  return left.title === right.title && left.body === right.body
}

export function isSaveStateDirty(state: SaveState): boolean {
  return !snapshotsEqual(state.current, state.baseline)
}

export function createSaveState(initial: SaveSnapshot): SaveState {
  return {
    baseline: initial,
    current: initial,
    pending: false,
    status: 'clean',
    requestId: 0,
  }
}

export function editSaveState(state: SaveState, current: SaveSnapshot): SaveState {
  return {
    ...state,
    current,
    status: state.pending ? 'saving' : snapshotsEqual(current, state.baseline) ? 'clean' : 'dirty',
  }
}

export type SaveAttempt = {
  state: SaveState
  snapshot: SaveSnapshot
  requestId: number
} | null

export function beginSave(state: SaveState): SaveAttempt {
  if (state.pending || !isSaveStateDirty(state)) return null

  const requestId = state.requestId + 1
  return {
    state: {
      ...state,
      pending: true,
      status: 'saving',
      requestId,
    },
    snapshot: state.current,
    requestId,
  }
}

export function resolveSave(
  state: SaveState,
  requestId: number,
  snapshot: SaveSnapshot,
  ok: boolean,
): SaveState {
  // A late response must not overwrite the state of a newer request.
  if (!state.pending || state.requestId !== requestId) return state

  if (!ok) {
    return {
      ...state,
      pending: false,
      status: 'error',
    }
  }

  const currentMatchesAcknowledged = snapshotsEqual(state.current, snapshot)
  return {
    ...state,
    baseline: snapshot,
    pending: false,
    status: currentMatchesAcknowledged ? 'saved' : 'dirty',
  }
}
