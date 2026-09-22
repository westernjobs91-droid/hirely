import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const extension = join(root, 'hirely-extension')
const manifest = JSON.parse(readFileSync(join(extension, 'manifest.json'), 'utf8'))
const output = join(root, 'dist', `hirely-extension-${manifest.version}.zip`)
const publicOutput = join(root, 'public', 'downloads', `hirely-extension-${manifest.version}.zip`)
const files = [
  'manifest.json',
  'background.js',
  'config.js',
  'content.js',
  'gmail-engine.js',
  'gmail.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
]

mkdirSync(dirname(output), { recursive: true })
rmSync(output, { force: true })
const result = spawnSync('zip', ['-q', output, ...files], { cwd: extension, stdio: 'inherit' })
if (result.status !== 0) process.exit(result.status || 1)
mkdirSync(dirname(publicOutput), { recursive: true })
copyFileSync(output, publicOutput)
console.log(output)
console.log(publicOutput)
