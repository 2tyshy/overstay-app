import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Inject a build timestamp + short git sha (when available) so the running
// app can prove which deploy it is. Visible as `__BUILD_TAG__` in the
// header — useful to confirm a Vercel build actually shipped.
function shortSha(): string {
  try {
    // require at runtime so config still loads on systems without git
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { execSync } = require('child_process')
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim()
  } catch { return 'nogit' }
}

const BUILD_TAG = `${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${shortSha()}`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  define: {
    __BUILD_TAG__: JSON.stringify(BUILD_TAG),
  },
  server: { host: true },
})
