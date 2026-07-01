import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// Versao gravada em src/version.json pelo hook pre-commit (scripts/write-version.js).
// Nao roda `git` aqui porque o ambiente de build do Vercel nao tem um remote
// git configuravel para aprofundar o clone raso — ver CLAUDE.md (Versionamento).
function getAppVersion() {
  try {
    const raw = readFileSync(new URL('./src/version.json', import.meta.url), 'utf8')
    return JSON.parse(raw).version
  } catch {
    return '1.0.0'
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },
})
