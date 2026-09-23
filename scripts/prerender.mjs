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
const { render, ROUTES, HOME_DESC, CASE_META } = await import(pathToFileURL(ssrEntry).href)

const SITE = 'https://88lin.github.io/website/'
const MARKER = '<div id="root"></div>'

/* 每条路由的 title / description 全部来自 entry-server（那里从 site.ts 与 cases.ts 现算）。 */
const META = { '/': { title: null, desc: HOME_DESC }, ...CASE_META }

const swap = (html, re, next) => (re.test(html) ? html.replace(re, next) : html)

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

  const meta = META[route]
  if (meta) {
    const d = meta.desc.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    html = swap(html, /<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${d}" />`)
    html = swap(
      html,
      /<meta\s+property="og:description"[\s\S]*?\/>/,
      `<meta property="og:description" content="${d}" />`,
    )
    // 首页沿用 index.html 里那套 title / canonical，只有子页要换
    if (meta.title) {
      const t = meta.title.replace(/&/g, '&amp;')
      html = swap(html, /<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
      html = swap(html, /<meta\s+property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${t}" />`)
      html = swap(
        html,
        /<link rel="canonical"[^>]*>/,
        `<link rel="canonical" href="${SITE}${route.replace(/^\//, '')}" />`,
      )
    }
  }

  html = html.replace(MARKER, `<div id="root">${render(route)}</div>`)

  const outDir = route === '/' ? DIST : path.join(DIST, route.replace(/^\/|\/$/g, ''))
  await mkdir(outDir, { recursive: true })
  const outFile = path.join(outDir, 'index.html')
  await writeFile(outFile, html)
  total += Buffer.byteLength(html)
  console.log(`prerender: ${route.padEnd(18)} → ${(Buffer.byteLength(html) / 1024).toFixed(1)} kB`)
}

try {
  await rm(path.join(ROOT, 'dist-ssr'), { recursive: true, force: true })
} catch {
  // 某些沙箱环境会拦截递归删除（safe-delete）；dist-ssr 只是中间产物，留着无害。
  console.log('prerender: dist-ssr 清理被环境拦截，忽略')
}
console.log(`prerender: ${ROUTES.length} 条路由，合计 ${(total / 1024).toFixed(1)} kB`)
