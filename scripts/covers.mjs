/**
 * v7 素材管线：把 88lin 名下**还挂在线上**的页面逐个截真图。
 *
 * 为什么是真截图而不是生成图：这一页给招聘方、创意总监和技术负责人看，
 * 图就是证据。生成的漂亮插画在这个场景里等于零可信度。
 *
 * 两个例外，都不是"假界面"：
 *  - 只有仓库没有站点的项目（diataxis / WeSum），取 GitHub 官方社交预览卡
 *    （opengraph.githubassets.com），那是 GitHub 自己生成的真实卡片。
 *  - video_vip 的 18 路接口海报另由 cover-vip.mjs 生成，是真实数据的信息设计。
 *
 * 统一手法：**用容器统一，不用滤镜统一**。这里只做等比裁切与编码，
 * 不加双色调、不加重滤镜——洗过的截图就不是证据了。视觉统一交给页面里的
 * 底卡 + 手绘外框 + 同色相投影。
 *
 * 用法：node scripts/covers.mjs [--only id1,id2]
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'

const ROOT = new URL('../', import.meta.url).pathname
const OUT = path.join(ROOT, 'public/covers')
const TMP = '/workspace/tmp-covers'

/** 桌面取景。DPR 2 拍，落盘前缩到 1440 宽——二倍图缩一半比直接一倍图锐。 */
const VP = { width: 1440, height: 900 }
const W = 1440
const H = 900
/** 小图供 srcset 用，手机不该下 1440 宽的图 */
const SM = 720

/**
 * `wait` 是 networkidle 之后**额外**等的毫秒数。
 * 特效页需要等到粒子铺开，只等 load 会拍到一片空白。
 */
const TARGETS = [
  // ---- 六个作品 ----
  { id: 'video-vip', url: 'https://88lin.github.io/vip/', wait: 3500, group: 'work' },
  { id: 'lofi', url: 'https://lofi.88lin.eu.org', wait: 5000, group: 'work' },
  { id: 'repair', url: 'https://repair.88lin.eu.org/', wait: 3500, group: 'work' },
  {
    id: 'gzh',
    url: 'https://88lin.github.io/gzh-design-skill/docs/gallery/index.html',
    wait: 4000,
    group: 'work',
  },
  { id: 'diataxis', og: '88lin/diataxis-docs-skill', group: 'work' },
  { id: 'wesum', og: '88lin/wesum-wechat-monitor', group: 'work' },

  // ---- 数字花园精选 ----
  { id: 'fireworks', url: 'https://88lin.github.io/fireworks/', wait: 7000, dismiss: 6000, group: 'garden' },
  // 圣诞那两页在无头软件渲染下拍不出东西（整幅近乎纯色），换成同样在线且能拍到内容的
  { id: 'paperstudio', url: 'https://88lin.github.io/PaperStudio', wait: 4000, group: 'garden' },
  { id: 'gushi', url: 'https://88lin.github.io/gushi/dist/', wait: 4000, group: 'garden' },
  {
    id: 'poster-gen',
    url: 'https://88lin.github.io/academic-poster-generator/',
    wait: 4000,
    group: 'garden',
  },
  { id: 'periodic', url: 'https://88lin.github.io/Periodic-table-web', wait: 3500, group: 'garden' },
  { id: 'textcard', url: 'https://88lin.github.io/TextCard-Studio', wait: 3500, group: 'garden' },
  { id: 'research', url: 'https://research.88lin.eu.org', wait: 3500, group: 'garden' },
  { id: 'learn', url: 'https://learn.88lin.eu.org', wait: 4000, group: 'garden' },
  { id: 'music', url: 'https://88lin.github.io/notion/6/', wait: 3500, group: 'garden' },

  // ---- 写作 / 体系 ----
  { id: 'blog', url: 'https://blog.88lin.eu.org', wait: 4500, group: 'notes' },
  {
    id: 'designsystem',
    url: 'https://88lin.github.io/mydesign-system/components-preview.html',
    wait: 4000,
    group: 'notes',
  },
  { id: 'hub', url: 'https://88lin.github.io/', wait: 3500, group: 'notes' },
]

const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const only = onlyArg ? new Set(onlyArg.split('=')[1].split(',')) : null
const list = only ? TARGETS.filter((t) => only.has(t.id)) : TARGETS

await rm(TMP, { recursive: true, force: true })
await mkdir(TMP, { recursive: true })
await mkdir(OUT, { recursive: true })

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
})
const ctx = await browser.newContext({
  viewport: VP,
  deviceScaleFactor: 2,
  locale: 'zh-CN',
  colorScheme: 'light',
  userAgent: UA,
})

/**
 * 落盘：一张 1440 宽主图 + 一张 720 宽小图，都是 webp。
 * `contain` 用于 GitHub 社交预览卡——那是 2:1 的定版卡片，按 16:10 裁会把
 * 仓库名两端切掉（第一轮就切了）。截图则用 `cover` 取顶部取景。
 */
async function emit(id, buf, contain = false) {
  const fit = contain ? 'contain' : 'cover'
  const bg = { r: 255, g: 255, b: 255, alpha: 1 }
  await sharp(buf)
    .resize(W, H, { fit, position: 'top', background: bg })
    .webp({ quality: 74, effort: 6 })
    .toFile(path.join(OUT, `${id}.webp`))
  await sharp(buf)
    .resize(SM, Math.round((H / W) * SM), { fit, position: 'top', background: bg })
    .webp({ quality: 70, effort: 6 })
    .toFile(path.join(OUT, `${id}@sm.webp`))
}

const report = []
for (const t of list) {
  const rec = { id: t.id, group: t.group }
  try {
    if (t.og) {
      // GitHub 官方社交预览卡：仓库名、描述、star、语言，全是真数据
      const url = `https://opengraph.githubassets.com/1/${t.og}`
      const res = await fetch(url, { headers: { 'user-agent': UA } })
      rec.status = res.status
      if (!res.ok) throw new Error(`og ${res.status}`)
      await emit(t.id, Buffer.from(await res.arrayBuffer()), true)
      rec.kind = 'github-og'
      rec.source = url
    } else {
      const page = await ctx.newPage()
      let status = 0
      try {
        const res = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 45000 })
        status = res?.status() ?? 0
        await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
        if (t.dismiss) {
          await page.keyboard.press('Escape').catch(() => {})
          const btn = page
            .locator('button, .btn, a')
            .filter({ hasText: /确定|确认|开始|进入|知道了|关闭|OK|Start/i })
            .first()
          await btn.click({ timeout: 4000 }).catch(() => {})
          await page.waitForTimeout(t.dismiss)
        }
        await page.waitForTimeout(t.wait ?? 3000)
        // 有的站把字体挂在 CDN 上一直不 resolve，screenshot 内置的 fonts.ready
        // 等待会直接超时。先自己 race 一次，再给截图放宽超时。
        await page
          .evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]))
          .catch(() => {})
        const buf = await page.screenshot({ clip: { x: 0, y: 0, ...VP }, timeout: 60000 })
        await emit(t.id, buf)
        rec.kind = 'screenshot'
        rec.source = t.url
      } finally {
        rec.status = status
        await page.close()
      }
    }
    // 空白图检测：方差太低说明拍到了纯色/骨架屏
    const st = await sharp(path.join(OUT, `${t.id}.webp`)).stats()
    rec.stdev = +(st.channels.reduce((a, c) => a + c.stdev, 0) / st.channels.length).toFixed(1)
    rec.ok = rec.stdev > 8
    if (!rec.ok) rec.error = '画面近乎纯色，疑似骨架屏或未渲染'
  } catch (e) {
    rec.ok = false
    rec.error = String(e).slice(0, 180)
  }
  report.push(rec)
  console.log(
    `${rec.ok ? 'ok  ' : 'FAIL'} ${rec.id.padEnd(16)} ${String(rec.status ?? '').padEnd(4)} stdev=${rec.stdev ?? '-'}  ${rec.error ?? ''}`,
  )
}

await browser.close()
await writeFile(path.join(ROOT, 'covers-report.json'), JSON.stringify({ at: new Date().toISOString(), report }, null, 2))

const bad = report.filter((r) => !r.ok)
console.log(`\n${report.length - bad.length}/${report.length} 张可用`)
if (bad.length) console.log('不可用：', bad.map((b) => b.id).join(', '))
