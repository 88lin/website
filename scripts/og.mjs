/**
 * 生成分享卡 public/og.png（1200×630）。
 *
 * 这张图不是站点截图。链接被贴进 IM 或简历里的时候，缩略图常常只有 500px 宽，
 * 首屏那套三行阶梯标题 + 4×4 字盘缩到那个尺寸只剩一团灰，读不出任何东西。
 * 所以单做一版：字号按缩略图定，字盘收成 2×2 四枚大铅字，其余全部让位。
 *
 * 字体直接读 /workspace/fonts 下的全量 TTF（构建期产物，不进 dist），
 * 不受 public/fonts 子集的字表限制。
 *
 * 用法：node scripts/og.mjs
 */
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'og.png')

const SERIF = 'file:///workspace/fonts/ds/NotoSerifSC.ttf'
const SANS = 'file:///workspace/fonts/noto/NotoSansSC.ttf'
const FRAUNCES = 'file:///workspace/fonts/ds/Fraunces.ttf'

/** 与 palettes.css 的 A 档一致 */
const C = {
  cream: '#FEFCF6',
  creamDark: '#F5F1E4',
  ink: '#1A1A2E',
  inkLight: '#4A4A63',
  brand: '#1E5BA8',
  highlight: '#F4D758',
  rail: '#DCD6C4',
  paper: '#F2EFE6',
}

/** 铅字块：面 + 往右下挤出去的字身。ladder 一层 1px，堆到 depth。 */
function extrude(side, depth = 13) {
  const steps = []
  for (let i = 1; i <= depth; i++) steps.push(`${i}px ${i}px 0 ${side}`)
  steps.push(`${depth + 4}px ${depth + 6}px 22px rgba(26,26,46,.20)`)
  return steps.join(',')
}

const SLUGS = [
  { c: '茉', face: C.brand, ink: '#FFFFFF', side: '#123C72', rot: -1.6 },
  { c: '灵', face: C.paper, ink: C.ink, side: '#CFC9B8', rot: 1.1 },
  { c: '智', face: C.ink, ink: '#F4F2EA', side: '#0B0B18', rot: 0.9 },
  { c: '库', face: C.highlight, ink: C.ink, side: '#C2A82F', rot: -1.2 },
]

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<style>
@font-face { font-family: 'S'; src: url('${SERIF}') format('truetype'); font-weight: 100 900 }
@font-face { font-family: 'N'; src: url('${SANS}') format('truetype'); font-weight: 100 900 }
@font-face { font-family: 'F'; src: url('${FRAUNCES}') format('truetype'); font-weight: 100 900 }
* { margin: 0; padding: 0; box-sizing: border-box }
body {
  width: 1200px; height: 630px; background: ${C.cream}; color: ${C.ink};
  font-family: 'N', sans-serif; -webkit-font-smoothing: antialiased;
  display: grid; grid-template-columns: 1px 1fr; column-gap: 56px;
  padding: 62px 74px 54px 76px; overflow: hidden;
}
.rail { background: ${C.rail} }
/* min-width:0 —— grid item 默认 min-width:auto，h1 用了 nowrap，一旦标题加上
   字盘超过 1fr，列会被顶宽，右边距被吃掉 24px，而 body 的 overflow:hidden 让
   scrollWidth 看不出来。下面的字号/间距都按 1fr=993px 反算过。 */
.body { min-width: 0; display: flex; flex-direction: column; justify-content: space-between }
.eyebrow { display: flex; align-items: baseline; gap: 12px; font-size: 21px; letter-spacing: .01em }
.eyebrow b { font-weight: 600 }
.eyebrow i { font-family: 'F'; font-style: normal; font-weight: 600; color: ${C.brand}; font-size: 19px; letter-spacing: .04em }
.mid { display: flex; align-items: flex-start; justify-content: space-between; gap: 36px; margin-top: 4px }
h1 {
  font-family: 'S'; font-weight: 700; font-size: 74px; line-height: 1.16;
  letter-spacing: -0.025em; white-space: nowrap;
}
/* 行内元素的背景盒是字体的 content area（≈1.45em），不是行盒。直接按百分比铺
   会让荧光条垂到基线下面一大截，看着像另加的一根色棒。改成按 em 定位：从盒顶
   0.84em 起、厚 0.36em，正好压在字身下三分之一到基线。 */
h1 .hl {
  background: linear-gradient(${C.highlight}, ${C.highlight}) no-repeat;
  background-size: 100% 0.40em; background-position: 0 0.58em; padding: 0 .05em;
}
.sub { margin-top: 26px; font-size: 24px; color: ${C.inkLight}; letter-spacing: .01em }
/* gap 要大于挤出深度（13px）加投影，否则左边那枚的字身直接顶在右边那枚的面上 */
.forme { display: grid; grid-template-columns: repeat(2, 118px); gap: 27px; flex: none; padding: 6px 0 0 0 }
.slug {
  width: 118px; height: 118px; border-radius: 3px; display: grid; place-items: center;
  font-family: 'S'; font-weight: 700; font-size: 74px; line-height: 1;
}
.foot { display: flex; align-items: baseline; justify-content: space-between; border-top: 1px solid ${C.rail}; padding-top: 20px }
.stat { font-size: 20px; color: ${C.inkLight} }
.stat b { font-family: 'F'; font-weight: 600; color: ${C.ink}; font-size: 22px; letter-spacing: .01em }
.url { font-family: 'F'; font-weight: 600; font-size: 21px; letter-spacing: .015em; color: ${C.brand} }
</style></head><body>
<div class="rail"></div>
<div class="body">
  <p class="eyebrow"><b>茉灵智库</b><i>88lin</i></p>
  <div class="mid">
    <div>
      <h1>把前沿 AI<br><span class="hl">变成看得见</span>的工程。</h1>
      <p class="sub">AI Agent 工程 &#215; 创意前端 &#183; 从模型能力到可维护的界面</p>
    </div>
    <div class="forme">
      ${SLUGS.map(
        (s) =>
          `<div class="slug" style="background:${s.face};color:${s.ink};transform:rotate(${s.rot}deg);box-shadow:${extrude(s.side)}">${s.c}</div>`
      ).join('')}
    </div>
  </div>
  <div class="foot">
    <p class="stat"><b>21</b> 个原创仓库 &#183; <b>4,667</b> star &#183; <b>55</b> 篇文章</p>
    <p class="url">88lin.github.io/website</p>
  </div>
</div>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(400)
const fit = await page.evaluate(() => {
  const d = document.documentElement
  const box = document.querySelector('.foot').getBoundingClientRect()
  return { over: [d.scrollWidth - 1200, d.scrollHeight - 630], footRight: Math.round(box.right) }
})
const buf = await page.screenshot({ type: 'png' })
await writeFile(OUT, buf)
await browser.close()
console.log(`og.png ${(buf.length / 1024).toFixed(1)} KB → public/og.png  溢出 ${fit.over}  版心右缘 ${fit.footRight}`)
if (fit.over[0] > 0 || fit.over[1] > 0) process.exitCode = 1
