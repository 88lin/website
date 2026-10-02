/* 构建期预渲染：把每条路由的首屏 DOM 渲成字符串，写进各自的 index.html。 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/* Windows 上 URL.pathname 会给 /C:/... 开头斜杠，join 之后读文件就变成
   C:\C:\...。必须走 fileURLToPath。 */
const ROOT = fileURLToPath(new URL('../', import.meta.url))
const DIST = path.join(ROOT, 'dist')
const shell = await readFile(path.join(DIST, 'index.html'), 'utf8')
const ssrEntry = path.join(ROOT, 'dist-ssr/entry-server.js')
const { render, ROUTES, seoTags, SITE_URL, llmsText } = await import(pathToFileURL(ssrEntry).href)

const MARKER = '<div id="root"></div>'
const SEO_MARKER = '<meta name="site-seo-placeholder" />'
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const headFor = (route) => seoTags(route).map(({ tag, attrs, text }) => {
  const attributes = Object.entries(attrs || {}).map(([k, v]) => ` ${k}="${escapeHtml(v)}"`).join('')
  const start = `<${tag}${attributes} data-site-seo=""`
  return tag === 'meta' || tag === 'link' ? `${start} />` : `${start}>${tag === 'script' ? text : escapeHtml(text || '')}</${tag}>`
}).join('\n    ')
if (!shell.includes(SEO_MARKER)) throw new Error('prerender: missing SEO placeholder')

if (!shell.includes(MARKER)) {
  console.error('prerender: 没找到空的 #root 挂载点')
  process.exit(1)
}

let total = 0
for (const route of ROUTES) {
  // 先把外壳（head 里的 ./assets、./favicon.svg、./og.png）按路由深度改写，
  // 再塞入 SSR 标记 —— 标记里的相对路径由组件自己按路由深度算，不能被这里动到，
  // 否则水合时客户端算出来的 src 和 HTML 里的对不上。
  const up = '../'.repeat(route.split('/').filter(Boolean).length)
  let html = up ? shell.replace(/(href|src|content)="\.\/(?!\/)/g, `$1="${up}`) : shell

  html = html.replace(SEO_MARKER, () => headFor(route))

  html = html.replace(MARKER, `<div id="root" data-route="${route}">${render(route)}</div>`)

  const outDir = route === '/' ? DIST : path.join(DIST, route.replace(/^\/|\/$/g, ''))
  await mkdir(outDir, { recursive: true })
  const outFile = path.join(outDir, 'index.html')
  await writeFile(outFile, html)
  total += Buffer.byteLength(html)
  console.log(`prerender: ${route.padEnd(18)} → ${(Buffer.byteLength(html) / 1024).toFixed(1)} kB`)
}

// 每次普通 build 都生成发现文件，避免只跑 build 时发布过期的域名或路由。
const pub = path.join(ROOT, 'public')
// 没有逐页的实质内容修改日期时省略 lastmod，不能用统计快照日或构建日代替。
const urls = ROUTES.map((route) => `  <url><loc>${SITE_URL}${route.replace(/^\//, '')}</loc></url>`).join('\n')
const files = {
  'robots.txt': `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`,
  'sitemap.xml': `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  'llms.txt': llmsText(),
  CNAME: new URL(SITE_URL).hostname + '\n',
}
for (const [name, text] of Object.entries(files)) {
  await writeFile(path.join(pub, name), text)
  await writeFile(path.join(DIST, name), text)
}

try {
  await rm(path.join(ROOT, 'dist-ssr'), { recursive: true, force: true })
} catch {
  // 某些沙箱环境会拦截递归删除（safe-delete）；dist-ssr 只是中间产物，留着无害。
  console.log('prerender: dist-ssr 清理被环境拦截，忽略')
}
console.log(`prerender: ${ROUTES.length} 条路由，合计 ${(total / 1024).toFixed(1)} kB`)
