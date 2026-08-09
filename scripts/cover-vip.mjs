/**
 * video_vip 的封面。
 *
 * 另外三个封面是真实站点截图（见 covers.mjs）；video_vip 是一段油猴脚本，
 * 没有自己的界面可截，所以这里把它「真正的界面」画出来——
 * 18 路解析接口的名字，逐字来自 vv.user.js，不是编的。
 *
 * 用法：node scripts/cover-vip.mjs
 */
import { chromium } from 'playwright'
import { writeFile, mkdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { existsSync } from 'node:fs'

const ROOT = path.join(new URL('../', import.meta.url).pathname)


// 直接从 TS 源码里抠出数组，避免为了一张图去起 ts 运行时
const text = await (await import('node:fs/promises')).readFile(path.join(ROOT, 'src/content/cases.ts'), 'utf8')
const grab = (name) =>
  [...text.split(`export const ${name} = [`)[1].split(']')[0].matchAll(/'([^']+)'/g)].map((m) => m[1])
const ifaces = grab('vipInterfaces')
const hosts = grab('vipHosts')
if (ifaces.length !== 18) throw new Error(`接口数对不上：${ifaces.length}`)

const NOTO = '/workspace/fonts/noto/NotoSansSC.ttf'
const MONO = ['/workspace/fonts/ds/JetBrainsMono.ttf', '/workspace/fonts/ds/JetBrainsMono-Regular.ttf'].find(
  (p) => existsSync(p),
)

const TONES = ['#f2da2e', '#12a594', '#f07a12', '#4c82f0', '#e01234']
const chips = ifaces
  .map((n, i) => {
    const t = TONES[(i * 3 + Math.floor(i / 5)) % TONES.length]
    const ink = t === '#e01234' ? '#fffdf4' : '#10122b'
    return `<li style="--t:${t};--i:${ink}"><b>${String(i + 1).padStart(2, '0')}</b><span>${n}</span></li>`
  })
  .join('')

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:N;src:url('file://${NOTO}');font-weight:100 900}
${MONO ? `@font-face{font-family:M;src:url('file://${MONO}');font-weight:100 900}` : ''}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:750px;background:#12308c;font-family:N,sans-serif;color:#fffdf4;overflow:hidden;
  background-image:radial-gradient(rgba(255,253,244,.10) 1.4px,transparent 1.4px);background-size:13px 13px}
.w{padding:52px 56px;height:100%;display:flex;flex-direction:column;gap:26px}
header{display:flex;align-items:flex-end;justify-content:space-between;border-bottom:3px solid rgba(255,253,244,.34);padding-bottom:18px}
h1{font-size:62px;font-weight:900;letter-spacing:-.02em;line-height:1}
.sub{font-family:M,monospace;font-size:15px;letter-spacing:.16em;color:#c8d6ff;margin-top:12px}
.big{text-align:right;font-family:M,monospace;line-height:1}
.big b{display:block;font-size:56px;font-weight:800;color:#f2da2e}
.big span{font-size:13px;letter-spacing:.2em;color:#c8d6ff}
ul{list-style:none;display:grid;grid-template-columns:repeat(6,1fr);grid-auto-rows:1fr;gap:12px;flex:1}
li{background:var(--t);color:var(--i);border-radius:4px;padding:12px 12px 11px;min-height:74px;
  display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 3px 10px rgba(8,20,64,.32)}
li b{font-family:M,monospace;font-size:13px;font-weight:800;opacity:.8}
li span{font-size:21px;font-weight:700;letter-spacing:-.01em}
footer{display:flex;gap:0;align-items:stretch;font-family:M,monospace;font-size:12.5px;
  letter-spacing:.1em;color:#c8d6ff;border-top:3px solid rgba(255,253,244,.34);padding-top:16px;flex-wrap:wrap}
footer i{font-style:normal;padding-right:22px;margin-right:22px;border-right:1px solid rgba(255,253,244,.24)}
footer i:last-child{border:0}
</style><div class="w">
<header><div><h1>接口一定会挂</h1><div class="sub">VIDEO_VIP · SWITCHABLE BY DESIGN</div></div>
<div class="big"><b>18</b><span>PARSE INTERFACES</span></div></header>
<ul>${chips}</ul>
<footer><i>${hosts.length} HOST ADAPTERS</i><i>4,581 STARS</i><i>471 FORKS</i><i>v3.1.10</i><i>714 LOC</i></footer>
</div>`

const tmp = path.join(ROOT, '.shots/cover-vip.html')
await mkdir(path.dirname(tmp), { recursive: true })
await writeFile(tmp, html)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
await page.goto('file://' + tmp)
await page.waitForTimeout(900)
const png = path.join(ROOT, '.shots/cover-vip.png')
await page.screenshot({ path: png })
await browser.close()

const out = path.join(ROOT, 'public/covers/video-vip.webp')
const r = spawnSync('cwebp', ['-quiet', '-q', '82', '-m', '6', png, '-o', out])
if (r.status !== 0) throw new Error('cwebp 失败: ' + r.stderr)
console.log('→ public/covers/video-vip.webp')
process.exit(0)
