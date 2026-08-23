/**
 * 四个方向的对照预览服务器。一个进程，四个方向挂在四条子路径下。
 *
 * 跑法：npm run preview:all
 *   先要有产物：逐个分支 npm run build，然后把 dist 拷进 .shots/preview/<vXX>/。
 *   （scripts/preview-build.mjs 会替你做这一步）
 *   http://localhost:4400/        ← 索引页，四个方向的入口
 *   http://localhost:4400/v13/    ← 现在的主线（七章全铺）
 *   http://localhost:4400/v15/    ← 脊线
 *   http://localhost:4400/v16/    ← 跨页
 *   http://localhost:4400/v17/    ← 工程图
 *
 * 为什么不是四个 dev server：产物用 base: './'，同一份 dist 挂在任何子路径下都成立，
 * 所以一个静态服务器就够，也顺带验证了子路径部署这条（GitHub Pages 就是子路径）。
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../.shots/preview/', import.meta.url))
const PORT = 4400

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
}

const DIRS = [
  ['type', '大标题的字 · 六种候选并排（同一句话，只有字体不同）'],
  ['v15', '脊线 · 满屏线场，二十五条线 = 二十五个原创仓库，字从线场里抠出来'],
  ['v16', '跨页 · 一张杂志跨页，三栏不等宽、首字下沉、脚注退到右栏'],
  ['v17', '工程图 · 图纸网格、刻度尺、尺寸线量的是标题真实宽度、右下角标题栏'],
  ['v13', '现在的主线 · 七章全铺（其余三个只有首屏）'],
]

const index = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>四个方向 · 对照预览</title>
<style>
 html{background:#fdfcf8;color:#1a1a2e}
 body{margin:0;font:400 17px/1.8 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",system-ui,sans-serif}
 .w{max-width:56rem;margin:0 auto;padding:clamp(2rem,7vh,5rem) clamp(1.25rem,4vw,3rem)}
 h1{font-size:clamp(1.75rem,4vw,2.75rem);line-height:1.25;margin:0 0 .5rem;font-weight:700}
 p.s{color:#4a4a5a;margin:0 0 2.5rem}
 ol{list-style:none;margin:0;padding:0}
 li{border-top:1px solid #e5e0d3}
 li:last-child{border-bottom:1px solid #e5e0d3}
 a{display:grid;grid-template-columns:4.5rem minmax(0,1fr) auto;gap:1rem;align-items:baseline;
   padding:1.1rem .25rem;color:inherit;text-decoration:none;transition:background-color .15s}
 a:hover{background:#fff}
 b{font:600 1.25rem/1 ui-monospace,SFMono-Regular,Consolas,monospace;color:#2B7FD8}
 span{color:#4a4a5a;font-size:.9375rem}
 i{font:400 .8125rem/1 ui-monospace,SFMono-Regular,Consolas,monospace;color:#6e6e80;font-style:normal}
 @media(max-width:640px){a{grid-template-columns:3.5rem minmax(0,1fr)}i{display:none}}
</style></head><body><div class="w">
<h1>四个方向，各一个首屏</h1>
<p class="s">除 v13 之外都只铺了首屏 —— 定了方向再铺全站。宽屏看，窄屏也都排过。</p>
<ol>${DIRS.map(([d, t]) => `<li><a href="/${d}/"><b>${d}</b><span>${t}</span><i>打开 ↗</i></a></li>`).join('')}</ol>
</div></body></html>`

const server = createServer(async (req, res) => {
  let rel = decodeURIComponent((req.url || '/').split('?')[0])
  if (rel === '/' || rel === '') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    return res.end(index)
  }
  if (rel.endsWith('/')) rel += 'index.html'
  const file = path.join(ROOT, rel)
  /* 越界防护：拼出来的路径必须还在 preview 目录里 */
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('403')
    return
  }
  try {
    const s = await stat(file)
    if (!s.isFile()) throw new Error('dir')
    const buf = await readFile(file)
    res.writeHead(200, {
      'content-type': MIME[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    })
    res.end(buf)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('404 ' + rel)
  }
})

server.listen(PORT, () => {
  console.log(`\n对照预览已起：\n`)
  console.log(`  索引        http://localhost:${PORT}/`)
  for (const [d, t] of DIRS) console.log(`  ${d.padEnd(4)}        http://localhost:${PORT}/${d}/   ${t.split(' · ')[0]}`)
  console.log(`\nCtrl+C 停止。\n`)
})
