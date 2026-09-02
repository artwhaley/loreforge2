import path from 'path'
import type { CollectionConfig } from 'payload'

/**
 * Local-filesystem media storage for the MVP. Files are written to
 * /public/media and served statically by Next.js at /media/<filename>.
 * No cloud/S3 — this is the deliberately-replaceable local storage seam.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'alt',
    defaultColumns: ['alt', 'filename'],
  },
  access: {
    read: () => true,
  },
  upload: {
    staticDir: path.resolve(process.cwd(), 'public/media'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    adminThumbnail: 'thumbnail',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
        height: 300,
        position: 'centre',
      },
      {
        name: 'banner',
        width: 1200,
        height: 400,
        position: 'centre',
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alt text',
    },
  ],
}
