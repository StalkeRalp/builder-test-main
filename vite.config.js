import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { readdirSync, statSync, existsSync, cpSync, mkdirSync } from 'fs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

function collectSiteHtmlInputs(rootDir) {
  const inputs = {}

  const topLevelPages = [
    'index.html',
    'my-project.html',
    'construction.html',
    'consultancy.html',
    'it-services.html',
    'energy.html',
    'supply.html',
    'suggestions.html'
  ]

  for (const file of topLevelPages) {
    const full = resolve(rootDir, file)
    if (!existsSync(full)) continue
    const key = file.replace(/\.html$/i, '').replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()
    inputs[key] = full
  }

  const appDirs = ['admin', 'client', 'superadmin']
  for (const dirName of appDirs) {
    const dirFull = resolve(rootDir, dirName)
    if (!existsSync(dirFull) || !statSync(dirFull).isDirectory()) continue
    const entries = readdirSync(dirFull, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile()) continue
      const name = entry.name
      const lower = name.toLowerCase()
      if (!lower.endsWith('.html')) continue
      if (lower.endsWith('.bak')) continue
      if (lower.includes('backup')) continue
      const rel = `${dirName}/${name}`
      const key = rel.replace(/\.html$/i, '').replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()
      inputs[key] = resolve(rootDir, rel)
    }
  }

  return inputs
}

function copyLegacyStaticSources() {
  return {
    name: 'copy-legacy-static-sources',
    writeBundle() {
      const srcDir = resolve(__dirname, 'src')
      const outSrcDir = resolve(__dirname, 'dist/src')

      if (!existsSync(srcDir)) return

      mkdirSync(resolve(__dirname, 'dist'), { recursive: true })
      cpSync(srcDir, outSrcDir, { recursive: true })
    }
  }
}

export default defineConfig({
  base: './',
  plugins: [
    tailwindcss(),
  ],
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: collectSiteHtmlInputs(__dirname),
      plugins: [copyLegacyStaticSources()],
    },
  },
})
