import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const appSource = await readFile('src/App.jsx', 'utf8')
const indexHtml = await readFile('dist/index.html', 'utf8')
const routes = new Set(['/register'])

for (const match of appSource.matchAll(/path\s*===\s*'((?:\/[^']*)?)'/g)) {
  routes.add(match[1])
}

for (const route of routes) {
  const segments = route.split('/').filter(Boolean)
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error(`Invalid route: ${route}`)
  }
  const directory = join('dist', ...segments)
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'index.html'), indexHtml)
}

console.log(`Created static entry pages for ${routes.size} routes.`)
