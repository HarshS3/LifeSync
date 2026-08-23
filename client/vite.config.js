import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const workspaceRoot = path.resolve(__dirname, '..')

// In Docker (standalone install), workspace root node_modules won't exist.
// Only add the workspace-root React aliases when running locally.
const workspaceReactPath = path.resolve(workspaceRoot, 'node_modules/react/index.js')
const hasWorkspaceReact = existsSync(workspaceReactPath)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, 'src') },
      ...(hasWorkspaceReact
        ? [
            { find: /^react$/, replacement: workspaceReactPath },
            { find: /^react-dom$/, replacement: path.resolve(workspaceRoot, 'node_modules/react-dom/index.js') },
          ]
        : []),
    ],
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
