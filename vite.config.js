import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

function getCommitCount() {
  try {
    return parseInt(execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim(), 10)
  } catch {
    return 0
  }
}

const commitCount = getCommitCount()

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(`1.0.${commitCount}`),
  },
})
