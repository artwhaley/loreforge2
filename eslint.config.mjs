import { defineConfig, globalIgnores } from 'eslint/config'
// eslint-config-next@16 exports a flat config array (no legacy named presets).
// The Next.js recommended preset ships as the `core-web-vitals` subpath export.
import nextVitals from 'eslint-config-next/core-web-vitals'

const designSeamMessage =
  'Designs consume Page Models; they do not discover protected Domain data (spec §33 Guardrail 2).'
const builderSeamMessage =
  'Client workspace modules must not import server-only Page Model builders (spec §33).'
const isolationSeamMessage =
  'First-class Designs (P08D-T09) are isolated presentation layers: no route tree, no theme presentation, no other Design, no legacy shared presentation (LegacyShellFrame/Legacy*Views).'
const legacyPresentationMessage =
  'Legacy shared frame/thin views (P08D-T08) are Poster-compatibility only; first-class Designs own their Shell and thin pages.'

export default defineConfig([
  ...nextVitals,
  globalIgnores(['.next/**', 'node_modules/**', 'src/payload-types.ts', 'src/app/(payload)/**']),
  {
    files: ['src/designs/**/*.ts', 'src/designs/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@/lib/payload', message: designSeamMessage },
            { name: '@/payload.config', message: designSeamMessage },
            { name: '@payload-config', message: designSeamMessage },
            { name: 'payload', message: designSeamMessage },
            { name: '@/lib/tenant/queries', message: designSeamMessage },
            { name: '@/lib/design/resolveRoute', message: 'Route resolution is server-only; Designs receive the resolved Design, never resolve it.' },
          ],
          patterns: [
            { group: ['@/lib/authz/*'], message: designSeamMessage },
            { group: ['@/collections/*'], message: designSeamMessage },
            { group: ['@/designs/*'], message: isolationSeamMessage },
            {
              group: [
                '@/lib/shell/*',
                '@/lib/home/*',
                '@/lib/document/*',
                '@/lib/departments/*',
                '@/lib/records/buildRecordsPageModel*',
              ],
              message: builderSeamMessage,
            },
          ],
        },
      ],
    },
  },
  {
    // First-class directories only (T09-A): Civic and Ledger may not touch the
    // legacy shared frame/thin presentation. T10/new Design registration adds
    // its folder to this set when it earns first-class status.
    files: ['src/designs/civic/**/*.ts', 'src/designs/civic/**/*.tsx', 'src/designs/ledger/**/*.ts', 'src/designs/ledger/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: '@/components/theme/LegacyShell.module.scss', message: legacyPresentationMessage }],
          patterns: [
            { group: ['../shared/legacy-*', '../shared/legacy-*/**'], message: legacyPresentationMessage },
            { group: ['@/app/**'], message: isolationSeamMessage },
            { group: ['@/components/theme/*'], message: isolationSeamMessage },
            { group: ['@/components/theme/**'], message: isolationSeamMessage },
          ],
        },
      ],
    },
  },
  {
    files: ['src/lib/records/workspace/**/*.ts', 'src/lib/records/workspace/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: '@/lib/design/resolveRoute', message: builderSeamMessage }],
          patterns: [
            {
              group: [
                '@/lib/shell/*',
                '@/lib/home/*',
                '@/lib/document/*',
                '@/lib/departments/*',
                '@/lib/records/buildRecordsPageModel*',
              ],
              message: builderSeamMessage,
            },
          ],
        },
      ],
    },
  },
])
