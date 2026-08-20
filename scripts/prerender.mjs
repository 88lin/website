/**
 * 构建期预渲染：把每条路由的首屏 DOM 渲成字符串，写进各自的 index.html。
 *
 * 为什么全站四条路由都要预渲染：
 *  1) LCP 元素（首屏大标题）不再等 React 下载执行——这也是「不要加载页」的前提。
 *  2) GitHub Pages 没有服务端重写，/case/lofi/ 必须真的存在一个 index.html，
 *     否则直链和爬虫都会吃 404。
 *  3) 静态板（.plateshot）也一起进了 HTML，所以首帧就已经是「页面背后有台机器」。
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/* Windows 上 URL.pathname 会给 /C:/... 开头斜杠，join 之后读文件就变成
   C:\C:\...。必须走 fileURLToPath。 */
const ROOT = fileURLToPath(new URL('../', import.meta.url))
const DIST = path.join(ROOT, 'dist')
const shell = await readFile(path.join(DIST, 'index.html'), 'utf8')
const ssrEntry = path.join(ROOT, 'dist-ssr/entry-server.js')
const { render } = await import(pathToFileURL(ssrEntry).href)
const { ROUTES } = await import(pathToFileURL(ssrEntry).href).then((m) => m)

const SITE = 'https://88lin.github.io/website/'
const MARKER = '<div id="root"></div>'

/** 每条路由自己的 title / description。四条路由四个 H1，audit 第 4 关会查。 */
const META = {
  '/': null, // 用 index.html 里已经写好的那套
  '/case/lofi/': {
    title: 'lofi-radio-web ｜ 把「电台」做成一个不用维护的静态页 · 茉灵智库',
    desc: '案例拆解：89★ 的 lofi-radio-web 如何用纯静态前端 + 可切换音源，做成一个上线后基本不用维护的电台页面。',
  },
  '/case/repair/': {
    title: 'computer-repair-skill ｜ 把排障经验写成 Agent 能执行的技能 · 茉灵智库',
    desc: '案例拆解：把「电脑修不好」这类模糊求助，变成一套 Agent 可以按步骤执行、可复核的诊断技能。',
  },
  '/case/facetmark/': {
    title: 'facetmark ｜ 四条索引逐维实测，赢的留、输的关 · 茉灵智库',
    desc: '案例拆解：给书签建四条索引再用 RRF 融合，然后逐维跑对照实验——融合输给最简配置 5.4pp，输掉的维度默认关闭，负面结果写进 README。',
  },
  '/case/video-vip/': {
    title: 'video_vip ｜ 4,658★ 的解析脚本怎么活过接口更替 · 茉灵智库',
    desc: '案例拆解：18 路解析接口、22 个站点适配、35 条注入规则。接口会挂，所以整套东西按「可切换」来设计。',
  },
}

const swap = (html, re, next) => (re.test(html) ? html.replace(re, next) : html)

if (!shell.includes(MARKER)) {
  console.error('prerender: 没找到空的 #root 挂载点')
  process.exit(1)
}

let total = 0
for (const route of ROUTES) {
  // 先把外壳（head 里的 ./assets、./favicon.svg、./og.png）按路由深度改写，
  // 再塞入 SSR 标记 —— 标记内部的资源路径由 useAsset() 自己算，不能被这里动到，
  // 否则水合时客户端算出来的 src 和 HTML 里的对不上。
  const up = '../'.repeat(route.split('/').filter(Boolean).length)
  let html = up ? shell.replace(/(href|src|content)="\.\/(?!\/)/g, `$1="${up}`) : shell

  const meta = META[route]
  if (meta) {
    const t = meta.title.replace(/&/g, '&amp;')
    const d = meta.desc.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    html = swap(html, /<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
    html = swap(html, /<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${d}" />`)
    html = swap(html, /<meta\s+property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${t}" />`)
    html = swap(
      html,
      /<meta\s+property="og:description"[\s\S]*?\/>/,
      `<meta property="og:description" content="${d}" />`,
    )
    html = swap(
      html,
      /<link rel="canonical"[^>]*>/,
      `<link rel="canonical" href="${SITE}${route.replace(/^\//, '')}" />`,
    )
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
