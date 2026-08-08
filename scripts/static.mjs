/**
 * 生成 favicon / OG 图 / robots / sitemap / 404，全部按站点配色程序化合成。
 */
import sharp from 'sharp'
import { writeFile, mkdir } from 'node:fs/promises'

const PUB = new URL('../public/', import.meta.url).pathname
const SITE = 'https://88lin.github.io/website/'
const PAPER = '#fbf5eb'
const INK = '#0e1230'
const COBALT = '#1226e8'
const VERM = '#ff3b14'

await mkdir(PUB, { recursive: true })

/* ---------------------------------------------------------------- favicon */
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${INK}"/>
  <circle cx="24" cy="26" r="13" fill="${COBALT}"/>
  <circle cx="41" cy="38" r="13" fill="${VERM}" fill-opacity="0.92"/>
  <rect x="8" y="52" width="48" height="4" fill="${PAPER}"/>
</svg>`
await writeFile(PUB + 'favicon.svg', favicon)

/* ---------------------------------------------------------------- OG 图 */
const SANS = 'Noto Sans CJK SC, Source Han Sans SC, PingFang SC, DejaVu Sans, sans-serif'
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PAPER}"/>
  <circle cx="1046" cy="168" r="164" fill="${COBALT}"/>
  <circle cx="1112" cy="452" r="104" fill="${VERM}"/>
  <g font-family="${SANS}" fill="${INK}">
    <text x="80" y="236" font-size="70" font-weight="700" letter-spacing="-2">前沿 AI，</text>
    <text x="80" y="322" font-size="70" font-weight="700" letter-spacing="-2">落地成看得见的工程。</text>
    <text x="80" y="404" font-size="29" fill="#5a5c74">AI Agent 工程 × 创意前端</text>
    <rect x="80" y="490" width="300" height="3" fill="${INK}"/>
    <text x="80" y="548" font-size="26" letter-spacing="2">茉灵智库 · 88lin</text>
    <text x="80" y="588" font-size="22" fill="#5a5c74" letter-spacing="1">88lin.github.io/website</text>
  </g>
</svg>`
await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile(PUB + 'og.png')

/* ---------------------------------------------------------------- robots / sitemap */
await writeFile(PUB + 'robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`)

const today = new Date().toISOString().slice(0, 10)
await writeFile(
  PUB + 'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>
</urlset>
`
)

/* ---------------------------------------------------------------- 404 */
await writeFile(
  PUB + '404.html',
  `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>页面不存在 · 茉灵智库</title>
<style>
  html{background:${PAPER};color:${INK}}
  body{margin:0;min-height:100vh;display:flex;align-items:center;
    font:400 16px/1.7 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
  .w{width:100%;max-width:72rem;margin:0 auto;padding:0 clamp(1.25rem,5vw,4rem)}
  h1{font-size:clamp(3rem,12vw,8rem);line-height:.92;letter-spacing:-.04em;margin:0 0 1.5rem}
  p{color:#5a5c74;max-width:38ch;margin:0 0 2.5rem}
  a{display:inline-block;background:${VERM};color:${INK};padding:1rem 2rem;
    text-decoration:none;font-weight:600}
  a:hover{background:#e02e0a}
  span{color:${COBALT}}
</style>
</head>
<body><div class="w">
  <h1>404<span>.</span></h1>
  <p>这个地址下没有东西。可能是链接过期了，也可能是我改过结构。</p>
  <a href="./">回首页</a>
</div></body>
</html>
`
)

console.log('static assets written')
