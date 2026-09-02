import path from 'path'
import { fileURLToPath } from 'url'

import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Documents } from './collections/Documents'
import { Memberships } from './collections/Memberships'
import { Tenants } from './collections/Tenants'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.DATABASE_URI) {
  throw new Error('DATABASE_URI is not set — copy .env.example to .env')
}
if (!process.env.PAYLOAD_SECRET) {
  throw new Error('PAYLOAD_SECRET is not set — copy .env.example to .env')
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Tenants, Memberships, Documents],
  editor: lexicalEditor(),
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI,
    },
  }),
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    autoGenerate: true,
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
