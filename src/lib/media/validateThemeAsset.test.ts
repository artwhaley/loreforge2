import assert from 'node:assert/strict'
import test from 'node:test'

import sharp from 'sharp'

import {
  MAX_THEME_ASSET_BYTES,
  validateThemeAsset,
} from './validateThemeAsset'

async function imageBuffer(format: 'jpeg' | 'png' | 'webp', width = 2, height = 2) {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 28, g: 60, b: 90, alpha: 1 },
    },
  })
    .toFormat(format)
    .toBuffer()
}

function asFile(bytes: Buffer | Uint8Array | string, name: string, type: string): File {
  const part = typeof bytes === 'string' ? bytes : new Uint8Array(bytes)
  return new File([part], name, { type })
}

test('accepts JPEG, PNG, and WebP and returns canonical re-encoded bytes', async () => {
  for (const [format, mime, extension] of [
    ['jpeg', 'image/jpeg', 'jpg'],
    ['png', 'image/png', 'png'],
    ['webp', 'image/webp', 'webp'],
  ] as const) {
    const source = await imageBuffer(format)
    const result = await validateThemeAsset(asFile(source, `seal.${extension}`, mime))
    assert.ok(result)
    assert.equal(result.format, format)
    assert.equal(result.mimeType, mime)
    assert.equal(result.width, 2)
    assert.equal(result.height, 2)
    assert.notDeepEqual(result.buffer, Buffer.concat([source, Buffer.from('<script>')]))
  }
})

test('rejects SVG, malformed data, and browser MIME/extension spoofing', async () => {
  const png = await imageBuffer('png')
  assert.equal(
    await validateThemeAsset(asFile('<svg><script>alert(1)</script></svg>', 'seal.svg', 'image/svg+xml')),
    null,
  )
  assert.equal(await validateThemeAsset(asFile(Buffer.from('not an image'), 'seal.png', 'image/png')), null)
  assert.equal(await validateThemeAsset(asFile(png, 'seal.jpg', 'image/jpeg')), null)
  assert.equal(await validateThemeAsset(asFile(png, 'seal.png', 'image/jpeg')), null)
})

test('rejects oversize, oversize-dimension, and trailing-payload inputs', async () => {
  assert.equal(
    await validateThemeAsset(
      asFile(Buffer.alloc(MAX_THEME_ASSET_BYTES + 1), 'huge.png', 'image/png'),
    ),
    null,
  )

  const wide = await imageBuffer('png', 4097, 1)
  assert.equal(await validateThemeAsset(asFile(wide, 'wide.png', 'image/png')), null)

  const png = await imageBuffer('png')
  assert.equal(
    await validateThemeAsset(asFile(Buffer.concat([png, Buffer.from('<script>alert(1)</script>')]), 'polyglot.png', 'image/png')),
    null,
  )
})
