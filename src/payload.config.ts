import path from 'path'
import { fileURLToPath } from 'url'

import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Documents } from './collections/Documents'
import { DocumentTypes } from './collections/DocumentTypes'
import { DocumentProvenanceEvents } from './collections/DocumentProvenanceEvents'
import { Characters } from './collections/Characters'
import { CharacterClaimRequests } from './collections/CharacterClaimRequests'
import { CharacterMergeRequests } from './collections/CharacterMergeRequests'
import { DomainCharacterContexts } from './collections/DomainCharacterContexts'
import { DomainAdmins } from './collections/DomainAdmins'
import { DomainMemberships } from './collections/DomainMemberships'
import { Domains } from './collections/Domains'
import { Subdomains } from './collections/Subdomains'
import { RoleAssignments } from './collections/RoleAssignments'
import { Roles } from './collections/Roles'
import { Folders } from './collections/Folders'
import { PermissionRules } from './collections/PermissionRules'
import { DocumentCharacterLinks } from './collections/DocumentCharacterLinks'
import { Tags } from './collections/Tags'
import { DocumentTags } from './collections/DocumentTags'
import { DocumentRelationships } from './collections/DocumentRelationships'
import { Media } from './collections/Media'
import { Memberships } from './collections/Memberships'
import { Pages } from './collections/Pages'
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

/**
 * Structured report forms (Ticket 07 spike).
 *
 * Field types are restricted to the five the MVP allows: short text, long
 * text, date, select, checkbox. Forms carry archive metadata (tenant,
 * destination folder, output title/Markdown templates) as extra fields; the
 * generation seam that consumes them lives in src/lib/forms/generateDocument.ts
 * — deliberately NOT inside plugin callbacks, so the authoring tool can be
 * swapped later without touching generation.
 */
const formBuilder = formBuilderPlugin({
  fields: {
    checkbox: true,
    date: true,
    select: true,
    text: true,
    textarea: true,
    country: false,
    email: false,
    message: false,
    number: false,
    state: false,
  },
  formOverrides: {
    admin: {
      useAsTitle: 'title',
      defaultColumns: ['title', 'domain', 'updatedAt'],
    },
    access: {
      read: () => true,
    },
    fields: ({ defaultFields }) => [
      ...defaultFields,
      {
        name: 'domain',
        type: 'relationship',
        relationTo: 'domains',
        index: true,
        label: 'Domain',
        admin: { description: 'Canonical Domain relationship. Populated by the Phase 3 migration.' },
      },
      {
        name: 'tenant',
        type: 'relationship',
        relationTo: 'tenants',
        required: true,
        index: true,
        admin: { hidden: true },
      },
      {
        name: 'folder',
        type: 'relationship',
        relationTo: 'folders',
        admin: {
          description: 'Destination folder for generated documents.',
        },
      },
      {
        type: 'group',
        name: 'archive',
        label: 'Archive output',
        fields: [
          {
            name: 'titleTemplate',
            type: 'text',
            required: true,
            admin: {
              description:
                'Output document title template, e.g. "{{incident_type}} Report - {{incident_date}}".',
            },
          },
          {
            name: 'markdownTemplate',
            type: 'textarea',
            required: true,
            admin: {
              description:
                'Output document Markdown template. {{field_name}} placeholders are replaced with submitted answers.',
            },
          },
        ],
      },
    ],
  },
  formSubmissionOverrides: {
    access: {
      create: () => true,
      read: () => true,
    },
  },
})

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Characters, CharacterClaimRequests, CharacterMergeRequests, DomainCharacterContexts, DomainMemberships, Domains, DomainAdmins, Subdomains, Roles, RoleAssignments, PermissionRules, DocumentCharacterLinks, Tags, DocumentTags, DocumentRelationships, DocumentTypes, DocumentProvenanceEvents, Tenants, Memberships, Documents, Folders, Pages, Media],
  plugins: [formBuilder],
  editor: lexicalEditor(),
  db: sqliteAdapter({
    push: process.env.PAYLOAD_PUSH !== 'false',
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
