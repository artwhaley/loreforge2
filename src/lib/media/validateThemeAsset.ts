import sharp from 'sharp'

export const MAX_THEME_ASSET_BYTES = 5 * 1024 * 1024
export const MAX_THEME_ASSET_DIMENSION = 4096

type ImageFormat = 'jpeg' | 'png' | 'webp'

export type ValidatedThemeAsset = {
  buffer: Buffer
  format: ImageFormat
  mimeType: `image/${'jpeg' | 'png' | 'webp'}`
  filename: string
  width: number
  height: number
}

const FORMAT_MIME: Record<ImageFormat, ValidatedThemeAsset['mimeType']> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

function extensionMatches(name: string, format: ImageFormat): boolean {
  const extension = name.toLowerCase().slice(name.lastIndexOf('.'))
  if (format === 'jpeg') return extension === '.jpg' || extension === '.jpeg'
  return extension === `.${format}`
}

function onlyWhitespaceAfter(buffer: Buffer, end: number): boolean {
  for (let index = end; index < buffer.length; index += 1) {
    if (!/\s/.test(String.fromCharCode(buffer[index]))) return false
  }
  return true
}

/** Reject files that contain a second payload after their image container. */
function hasNoTrailingPayload(buffer: Buffer, format: ImageFormat): boolean {
  if (format === 'jpeg') {
    const end = buffer.lastIndexOf(Buffer.from([0xff, 0xd9]))
    return end >= 0 && onlyWhitespaceAfter(buffer, end + 2)
  }

  if (format === 'png') {
    const marker = Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82])
    const end = buffer.lastIndexOf(marker)
    return end >= 0 && onlyWhitespaceAfter(buffer, end + marker.length)
  }

  // RIFF's declared size covers the WEBP header and all chunks. Any bytes
  // beyond it are a polyglot/trailing-payload attempt.
  if (buffer.length < 12 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    return false
  }
  const declaredLength = buffer.readUInt32LE(4) + 8
  return declaredLength === buffer.length
}

function canonicalFilename(originalName: string, format: ImageFormat): string {
  const base = originalName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.[^.]*$/, '')
    .slice(0, 80) || 'theme-asset'
  return `${base}.${format === 'jpeg' ? 'jpg' : format}`
}

/**
 * Decode and re-encode a Theme Studio asset into the narrow public image
 * contract. The browser-declared MIME is treated as an assertion and must
 * match the decoded format; it is never trusted as the validator.
 */
export async function validateThemeAsset(file: File): Promise<ValidatedThemeAsset | null> {
  if (!(file instanceof File) || file.size <= 0 || file.size > MAX_THEME_ASSET_BYTES) return null

  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length !== file.size) return null

  try {
    const source = sharp(buffer, {
      failOn: 'error',
      limitInputPixels: MAX_THEME_ASSET_DIMENSION * MAX_THEME_ASSET_DIMENSION,
      sequentialRead: true,
    })
    const metadata = await source.metadata()
    const format = metadata.format
    if (format !== 'jpeg' && format !== 'png' && format !== 'webp') return null
    if (file.type.toLowerCase() !== FORMAT_MIME[format] || !extensionMatches(file.name, format)) return null
    if (!metadata.width || !metadata.height) return null
    if (metadata.width > MAX_THEME_ASSET_DIMENSION || metadata.height > MAX_THEME_ASSET_DIMENSION) return null
    if (metadata.pages && metadata.pages > 1) return null
    if (!hasNoTrailingPayload(buffer, format)) return null

    const encoded = await source.toFormat(
      format,
      format === 'jpeg' ? { quality: 90 } : format === 'webp' ? { quality: 90 } : {},
    ).toBuffer()
    if (encoded.length > MAX_THEME_ASSET_BYTES) return null

    return {
      buffer: encoded,
      format,
      mimeType: FORMAT_MIME[format],
      filename: canonicalFilename(file.name, format),
      width: metadata.width,
      height: metadata.height,
    }
  } catch {
    return null
  }
}
