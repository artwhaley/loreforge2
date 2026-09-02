import { defineConfig } from 'eslint/config'
import nextPlugin from 'eslint-config-next'

const eslintConfig = [
  ...nextPlugin.configs['core-web-vitals'],
  {
    ignores: ['.next/**', 'node_modules/**', 'src/payload-types.ts', 'src/app/(payload)/**'],
  },
]

export default eslintConfig
