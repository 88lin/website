/**
 * 构建期预渲染：用 SSR 包把 <App/> 渲成字符串塞进 dist/index.html 的 #root。
 * 目的只有一个——LCP 元素（首屏大标题）不再等 React 下载执行。
 */
import { readFile, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = new URL('../', import.meta.url).pathname
const htmlPath = path.join(ROOT, 'dist/index.html')
const ssrEntry = path.join(ROOT, 'dist-ssr/entry-server.js')

const { render } = await import(pathToFileURL(ssrEntry).href)
const markup = render()

let html = await readFile(htmlPath, 'utf8')
const marker = '<div id="root"></div>'
if (!html.includes(marker)) {
  console.error('prerender: 没找到空的 #root 挂载点')
  process.exit(1)
}
html = html.replace(marker, `<div id="root">${markup}</div>`)
await writeFile(htmlPath, html)
await rm(path.join(ROOT, 'dist-ssr'), { recursive: true, force: true })

const kb = (Buffer.byteLength(html) / 1024).toFixed(1)
console.log(`prerender: 首屏已内联，index.html ${kb} kB`)
