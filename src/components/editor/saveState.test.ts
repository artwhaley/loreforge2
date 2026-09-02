import assert from 'node:assert/strict'
import test from 'node:test'

import {
  beginSave,
  createSaveState,
  editSaveState,
  isSaveStateDirty,
  resolveSave,
  type SaveSnapshot,
} from './saveState'

const original: SaveSnapshot = { title: 'A title', body: '# Original' }
const edited: SaveSnapshot = { title: 'A new title', body: '# Edited' }
const editedAgain: SaveSnapshot = { title: 'A new title', body: '# Edited again' }

test('tracks clean, dirty, and restored snapshots', () => {
  let state = createSaveState(original)
  assert.equal(state.status, 'clean')
  assert.equal(isSaveStateDirty(state), false)

  state = editSaveState(state, edited)
  assert.equal(state.status, 'dirty')
  assert.equal(isSaveStateDirty(state), true)

  state = editSaveState(state, original)
  assert.equal(state.status, 'clean')
  assert.equal(isSaveStateDirty(state), false)
})

test('takes one snapshot per save and suppresses duplicate saves', () => {
  const editedState = editSaveState(createSaveState(original), edited)
  const attempt = beginSave(editedState)
  assert.ok(attempt)
  assert.deepEqual(attempt.snapshot, edited)
  assert.equal(attempt.state.pending, true)
  assert.equal(beginSave(attempt.state), null)
})

test('successful save acknowledges the snapshot and remains dirty when edited while pending', () => {
  const attempt = beginSave(editSaveState(createSaveState(original), edited))
  assert.ok(attempt)

  const pendingWithNewEdit = editSaveState(attempt.state, editedAgain)
  const resolved = resolveSave(pendingWithNewEdit, attempt.requestId, attempt.snapshot, true)

  assert.equal(resolved.pending, false)
  assert.equal(resolved.status, 'dirty')
  assert.deepEqual(resolved.baseline, edited)
  assert.deepEqual(resolved.current, editedAgain)
  assert.equal(isSaveStateDirty(resolved), true)
})

test('successful save becomes clean only when the acknowledged snapshot is still current', () => {
  const attempt = beginSave(editSaveState(createSaveState(original), edited))
  assert.ok(attempt)
  const resolved = resolveSave(attempt.state, attempt.requestId, attempt.snapshot, true)

  assert.equal(resolved.pending, false)
  assert.equal(resolved.status, 'saved')
  assert.equal(isSaveStateDirty(resolved), false)
})

test('failed save preserves the old baseline and can be retried', () => {
  const attempt = beginSave(editSaveState(createSaveState(original), edited))
  assert.ok(attempt)
  const failed = resolveSave(attempt.state, attempt.requestId, attempt.snapshot, false)

  assert.equal(failed.pending, false)
  assert.equal(failed.status, 'error')
  assert.deepEqual(failed.baseline, original)
  assert.equal(isSaveStateDirty(failed), true)

  const retry = beginSave(failed)
  assert.ok(retry)
  assert.equal(retry.requestId, attempt.requestId + 1)
})

test('ignores stale and duplicate responses', () => {
  const attempt = beginSave(editSaveState(createSaveState(original), edited))
  assert.ok(attempt)
  const resolved = resolveSave(attempt.state, attempt.requestId, attempt.snapshot, true)
  assert.deepEqual(resolveSave(resolved, attempt.requestId, attempt.snapshot, false), resolved)

  const newerAttempt = beginSave(editSaveState(resolved, editedAgain))
  assert.ok(newerAttempt)
  assert.deepEqual(
    resolveSave(newerAttempt.state, attempt.requestId, attempt.snapshot, true),
    newerAttempt.state,
  )
})
