/**
 * 上线前自动验收。十二关，任何一关 fail 都让进程以非零码退出。
 *
 *  1 子路径部署        2 Lighthouse          3 对比度矩阵
 *  4 破折号            5 版式纪律与禁用清单   6 reduced-motion 降级
 *  7 八章构图去重与密度 8 外链可达            9 字体子集 / 预算 / 设计系统规则
 * 10 滚动手感          11 3D 能力分级与降级   12 作品横推与案例堆叠
 *
 * 用法：node scripts/audit.mjs [--skip-lh] [--skip-links]
 *
 * v6 说明：这一版是照着「主线」的 DOM 重写的。上一版绑的是 v4 的机架 DOM
 * （.wtrack / .bay / .eyebrow--rail），v5 是带着一整屏红字上线的，别再让它发生。
 */
import { chromium } from 'playwright'
import { readFile, readdir, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { serveDist } from './lib/serve.mjs'
import { findOverflow } from './lib/overflow.mjs'

const ROOT = new URL('../', import.meta.url).pathname
const DIST = path.join(ROOT, 'dist')
const SKIP_LH = process.argv.includes('--skip-lh')
const SKIP_LINKS = process.argv.includes('--skip-links')

/** 八章。顺序、id、色调都跟 content/site.ts 对齐，错一个就说明内容层被改过。 */
const CHAPTERS = [
  { id: 'hero', tone: 'deep' },
  { id: 'metrics', tone: 'peach' },
  { id: 'tracks', tone: 'pine' },
  { id: 'works', tone: 'berry' },
  { id: 'cases', tone: 'deep' },
  { id: 'garden', tone: 'peach' },
  { id: 'writing', tone: 'paper' },
  { id: 'contact', tone: 'berry' },
]
const ROUTES = ['', 'case/lofi/', 'case/repair/', 'case/video-vip/']

// 故意挂在子路径下（GitHub Pages 的项目站就是 /website/），并开启 gzip 对齐线上传输
const { server, url: URL_BASE } = await serveDist({ dist: DIST, port: 4199 })
const withQ = (u, q) => u + (u.includes('?') ? '&' : '?') + q

const results = []
const pass = (id, name, detail) => results.push({ id, name, ok: true, detail })
const fail = (id, name, detail) => results.push({ id, name, ok: false, detail })

/* ------------------------------------------------------------------ */
/* 对比度工具：sRGB 相对亮度 + alpha 合成                                */
/* ------------------------------------------------------------------ */
const lum = ({ r, g, b }) => {
  const f = (v) => {
    v /= 255
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const over = (fg, bg) => ({
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a),
  a: 1,
})
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/* ------------------------------------------------------------------ */
/* 页面内采集脚本                                                        */
/*                                                                      */
/* 两个坑：                                                              */
/*  a) 颜色可能写成 oklab()/color-mix()，正则解析不了，统一先丢进 canvas   */
/*     让浏览器自己归一化成 rgba。                                        */
/*  b) 敞开章的底色来自 .stage（fixed、z-index:-1、pointer-events:none）， */
/*     它不进 elementsFromPoint 的命中列表。所以这些节点的底色会一路回落到  */
/*     body 的 --brand-deep —— 这正是设计上要求的：四个敞开章一律白字压     */
/*     深桑葚，双色场里最亮的一档也比 body 亮不到哪去，按 body 判是保守的。 */
/* ------------------------------------------------------------------ */
const COLLECT_SETUP = () => {
  let i = 0
  const bad = new Set(['script', 'style', 'noscript', 'title'])
  document.querySelectorAll('body *').forEach((el) => {
    if (bad.has(el.tagName.toLowerCase())) return
    if (el.closest('[aria-hidden="true"]')) return
    const direct = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3 && n.textContent.trim().length > 0)
      .map((n) => n.textContent.trim())
      .join(' ')
    if (!direct) return
    el.setAttribute('data-audit', String(i++))
  })
  return i
}

const COLLECT_VISIBLE = () => {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 1
  const cx2 = cv.getContext('2d', { willReadFrequently: true })
  const norm = (css) => {
    if (!css) return null
    cx2.clearRect(0, 0, 1, 1)
    try {
      cx2.fillStyle = '#000'
      cx2.fillStyle = css
      cx2.clearRect(0, 0, 1, 1)
      cx2.fillRect(0, 0, 1, 1)
    } catch {
      return null
    }
    const d = cx2.getImageData(0, 0, 1, 1).data
    return { r: d[0], g: d[1], b: d[2], a: +(d[3] / 255).toFixed(4) }
  }
  const chainVisible = (el) => {
    let n = el
    while (n) {
      const cs = getComputedStyle(n)
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return false
      n = n.parentElement
    }
    return true
  }
  const out = []
  document.querySelectorAll('[data-audit]:not([data-audit-done])').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return
    // 取元素与视口的交集作为采样区；比「整体入视口」宽松，超高标题也能测到
    const top = Math.max(r.top, 2)
    const bottom = Math.min(r.bottom, window.innerHeight - 2)
    const left = Math.max(r.left, 2)
    const right = Math.min(r.right, window.innerWidth - 2)
    if (bottom - top < 6 || right - left < 6) return
    if (!chainVisible(el)) {
      el.setAttribute('data-audit-done', 'hidden')
      return
    }
    const px = (left + right) / 2
    const py = (top + bottom) / 2
    let list = document.elementsFromPoint(px, py)
    const idx = list.indexOf(el)
    if (idx < 0) return // 被别的东西盖住了，换个滚动位置再测
    list = list.slice(idx)
    const stack = []
    for (const n of list) {
      const c = norm(getComputedStyle(n).backgroundColor)
      if (c && c.a > 0.001) stack.push(c)
      if (c && c.a >= 0.999) break
    }
    const html = norm(getComputedStyle(document.documentElement).backgroundColor)
    if (html && html.a >= 0.999) stack.push(html)
    const cs = getComputedStyle(el)
    el.setAttribute('data-audit-done', '1')
    out.push({
      tag: el.tagName.toLowerCase(),
      cls: typeof el.className === 'string' ? el.className.slice(0, 90) : '',
      text: (el.textContent || '').trim().slice(0, 40),
      fg: norm(cs.color),
      stack,
      size: parseFloat(cs.fontSize),
      weight: Number(cs.fontWeight) || 400,
    })
  })
  return out
}

/* ------------------------------------------------------------------ */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.65)
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 140))
    }
    window.scrollTo(0, document.body.scrollHeight)
    await new Promise((r) => setTimeout(r, 600))
  })
}

/** 逐屏推进，边滚边采，直到没有新节点为止。 */
async function collectContrast(page) {
  const total = await page.evaluate(COLLECT_SETUP)
  const rows = []
  const H = page.viewportSize().height
  const doc = await page.evaluate(() => document.body.scrollHeight)
  // 半屏步进两轮：第一轮抓大部分，第二轮用 1/3 屏错位补齐边界上的节点
  for (const frac of [0.5, 0.34]) {
    for (let y = 0; y <= doc; y += Math.round(H * frac)) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y)
      await page.waitForTimeout(120)
      rows.push(...(await page.evaluate(COLLECT_VISIBLE)))
    }
  }
  const missed = await page.evaluate(
    () => document.querySelectorAll('[data-audit]:not([data-audit-done])').length,
  )
  return { rows, total, missed }
}

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })

/* === 1. 子路径部署可用 =============================================== */
{
  const probs = []
  let imgCount = 0
  let sections = 0
  let plates = 0
  for (const route of ROUTES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const bad = []
    const errs = []
    page.on('response', (r) => {
      if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`)
    })
    page.on('pageerror', (e) => errs.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
    await page.goto(URL_BASE + route, { waitUntil: 'load' })
    await page.waitForTimeout(2200)
    await scrollThrough(page)
    await page.waitForTimeout(1200)
    // 状态码 200 不代表图能解码：本地服务器会把缺前缀的路径 302 回首页，
    // 图片拿到一份 HTML 就变成 complete=true / naturalWidth=0 的黑块。
    const shot = await page.evaluate(() => {
      for (const i of document.querySelectorAll('img')) i.loading = 'eager'
      return {
        sections: document.querySelectorAll('#root section[id]').length,
        imgs: document.querySelectorAll('img').length,
        plates: document.querySelectorAll('img.stage__plate').length,
      }
    })
    await page.waitForTimeout(1200)
    const broken = await page.evaluate(() =>
      [...document.querySelectorAll('img')]
        .filter((i) => !(i.complete && i.naturalWidth > 0))
        .map((i) => i.currentSrc || i.src),
    )
    const tag = route || '/'
    if (bad.length) probs.push(`${tag} 有 ${bad.length} 个 4xx：${bad.slice(0, 3).join(' | ')}`)
    if (errs.length) probs.push(`${tag} 运行时错误：${errs.slice(0, 2).join(' | ')}`)
    if (broken.length) probs.push(`${tag} ${broken.length} 张图解码失败：${broken.slice(0, 2).join(' | ')}`)
    if (!route) {
      sections = shot.sections
      plates = shot.plates
      if (shot.sections !== CHAPTERS.length) probs.push(`首页 ${shot.sections} 个 section，期望 ${CHAPTERS.length}`)
      // 舞台图版是按需下载的：滚完全程四张都该进 DOM，一张不进说明按需逻辑坏了
      if (shot.plates !== 4) probs.push(`滚完全程只挂了 ${shot.plates}/4 张舞台图版`)
    }
    imgCount += shot.imgs
    await ctx.close()
  }
  probs.length
    ? fail('1', '子路径部署 (/website/)', probs.join('\n      '))
    : pass(
        '1',
        '子路径部署 (/website/)',
        `${ROUTES.length} 条路由、${sections} 个章节、${imgCount} 张位图全部解码、${plates}/4 张舞台图版按需加载、0 个 4xx、0 个运行时错误`,
      )
}

/* === 3. 对比度矩阵 =================================================== */
const contrastReport = []
let missedTotal = 0
for (const target of [
  { route: '', name: 'home' },
  { route: 'case/video-vip/', name: 'case' },
]) {
  for (const vp of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: 'reduce', // 让所有入场动效直接落终态，避免漏检
    })
    const page = await ctx.newPage()
    await page.goto(URL_BASE + target.route, { waitUntil: 'load' })
    await page.waitForTimeout(1600)
    await scrollThrough(page)
    const { rows, missed } = await collectContrast(page)
    missedTotal += missed
    for (const n of rows) {
      if (!n.fg || !n.stack.length) continue
      // 从最底下的不透明色往上合成，得到文字真正压在什么颜色上
      let bg = null
      for (let i = n.stack.length - 1; i >= 0; i--) {
        const c = n.stack[i]
        bg = bg ? over(c, bg) : { ...c, a: 1 }
      }
      const composed = over(n.fg, bg)
      const r = ratio(composed, bg)
      const large = n.size >= 24 || (n.size >= 18.66 && n.weight >= 700)
      const need = large ? 3 : 4.5
      contrastReport.push({
        page: target.name,
        vp: vp.name,
        tag: n.tag,
        cls: n.cls,
        text: n.text,
        fg: n.fg,
        bg,
        size: n.size,
        weight: n.weight,
        ratio: +r.toFixed(2),
        need,
        ok: r >= need - 0.005,
      })
    }
    await ctx.close()
  }
}
{
  const bad = contrastReport.filter((c) => !c.ok)
  const worst = [...contrastReport].sort((a, b) => a.ratio - b.ratio).slice(0, 5)
  bad.length
    ? fail(
        '3',
        '对比度 ≥ WCAG AA',
        bad
          .slice(0, 14)
          .map((b) => `${b.page}/${b.vp} <${b.tag}> "${b.text}" ${b.ratio}:1 需 ${b.need} [${b.cls}]`)
          .join('\n      '),
      )
    : pass(
        '3',
        '对比度 ≥ WCAG AA',
        `${contrastReport.length} 个文本节点全部达标（${missedTotal} 个未采到）；最低 ${worst
          .map((w) => `${w.ratio}:1(${w.text.slice(0, 8)})`)
          .join(', ')}`,
      )
}

/* === 4. 破折号 / 连接号 ============================================= */
{
  const files = []
  const walk = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) await walk(p)
      else if (/\.(tsx?|css|html|md)$/.test(e.name)) files.push(p)
    }
  }
  await walk(path.join(ROOT, 'src'))
  files.push(path.join(ROOT, 'index.html'))
  const hits = []
  for (const f of files) {
    // palettes.css 是从 88lin/mydesign-system 原样搬过来的，不改一个字
    if (path.basename(f) === 'palettes.css') continue
    const txt = await readFile(f, 'utf8')
    txt.split('\n').forEach((line, i) => {
      // 只看会渲染出去的文案：注释里的破折号是给人看的说明，不是页面排版
      const code = line
        .replace(/\/\*.*$/, '')
        .replace(/^\s*\*.*$/, '')
        .replace(/\/\/.*$/, '')
        .replace(/<!--.*$/, '')
      // 按「排版职能」判而不是按字符判：
      //   连续两个 U+2014 = 中文破折号，合法
      //   紧排（两侧无空格）的 U+2013 = 连接号本职：2023–2026、正则字符类，合法
      //   剩下的都是空格分隔的插入语破折号 —— 这个才是要抓的 AI 味
      const stripped = code.replace(/\u2014\u2014/g, '').replace(/(?<=\S)\u2013(?=\S)/g, '')
      if (/[\u2014\u2013]/.test(stripped)) hits.push(`${path.relative(ROOT, f)}:${i + 1} ${line.trim().slice(0, 70)}`)
    })
  }
  hits.length
    ? fail('4', '无孤立 — / – 破折号', hits.join('\n      '))
    : pass('4', '无孤立 — / – 破折号', `扫描 ${files.length} 个文件，0 命中`)
}

/* === 5. 版式纪律与禁用清单 ==========================================
   用户点名杜绝的东西，逐条变成断言：居中平庸 Hero、章节编号 eyebrow、
   等宽三四列栅格、装饰圆点、emoji 图标、滚动提示。外加三个断点 0 横向溢出。 */
{
  const probs = []
  const notes = []
  for (const vp of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'laptop', width: 1024, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const ctx = await browser.newContext({ viewport: vp, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await page.goto(URL_BASE, { waitUntil: 'load' })
    await page.waitForTimeout(1500)
    await scrollThrough(page)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(400)

    const m = await page.evaluate(() => {
      const vw = window.innerWidth
      const txt = document.querySelector('#root').innerText

      const title = document.querySelector('.hero__title')
      const tRect = title ? title.getBoundingClientRect() : null
      const heroCentered =
        !title ||
        getComputedStyle(title).textAlign === 'center' ||
        (tRect && tRect.left / vw > 0.25)

      // 章节编号 eyebrow：标题块开头两位数字（01 / 关于我）
      const numbered = [...document.querySelectorAll('.hd')]
        .map((h) => (h.innerText || '').trim())
        .filter((t) => /^\d{2}\b/.test(t))

      // 等宽三列以上栅格
      const evenGrids = []
      for (const el of document.querySelectorAll('#root *')) {
        const cs = getComputedStyle(el)
        if (cs.display !== 'grid') continue
        const cols = cs.gridTemplateColumns.split(' ').filter(Boolean).map(parseFloat)
        if (cols.length < 3 || cols.some(Number.isNaN)) continue
        if (Math.max(...cols) - Math.min(...cols) < 1.5) {
          evenGrids.push(`${el.className || el.tagName}:${cols.length}列`)
        }
      }

      // 装饰圆点：正圆、没文字、父级也没文字（状态灯 .lamp i 的父级有文字，不算）
      const dots = []
      for (const el of document.querySelectorAll('#root *')) {
        const r = el.getBoundingClientRect()
        if (r.width < 3 || r.width > 14 || Math.abs(r.width - r.height) > 1) continue
        const cs = getComputedStyle(el)
        if (!/50%|9999px/.test(cs.borderRadius)) continue
        if ((el.textContent || '').trim()) continue
        if ((el.parentElement?.textContent || '').trim()) continue
        dots.push(el.className || el.tagName)
      }

      return {
        heroCentered,
        heroLeft: tRect ? +(tRect.left / vw).toFixed(3) : -1,
        numbered,
        evenGrids: [...new Set(evenGrids)],
        dots: [...new Set(dots)],
        emoji: (txt.match(/[\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2700}-\u{27BF}\u{FE0F}]/gu) || []).slice(0, 6),
        scrollHint: (txt.match(/向下滚|往下滚|滚动查看|scroll\s*down|↓/gi) || []).slice(0, 4),
        rail: document.querySelectorAll('nav.rail[aria-label="章节导航"] .rail__item').length,
        // CTA 折行：一个按钮跨了两行会渲染成两个 client rect
        ctaWrapped: [...document.querySelectorAll('.hero__cta .btn')].filter(
          (b) => b.getClientRects().length > 1,
        ).length,
      }
    })
    const ov = await page.evaluate(findOverflow)
    await ctx.close()

    if (m.heroCentered) probs.push(`${vp.name} Hero 居中或右移（左边缘 ${m.heroLeft}）`)
    if (m.numbered.length) probs.push(`${vp.name} ${m.numbered.length} 处章节编号 eyebrow：${m.numbered.join(' / ')}`)
    if (m.evenGrids.length) probs.push(`${vp.name} 等宽三列以上栅格：${m.evenGrids.join(' | ')}`)
    if (m.dots.length) probs.push(`${vp.name} 装饰圆点 ${m.dots.length} 处：${m.dots.join(' | ')}`)
    if (m.emoji.length) probs.push(`${vp.name} emoji ${m.emoji.join('')}`)
    if (m.scrollHint.length) probs.push(`${vp.name} 滚动提示：${m.scrollHint.join(' / ')}`)
    if (m.rail !== CHAPTERS.length) probs.push(`${vp.name} 锚点栏 ${m.rail} 项，期望 ${CHAPTERS.length}`)
    if (m.ctaWrapped) probs.push(`${vp.name} ${m.ctaWrapped} 个 CTA 折行`)
    if (ov.length) probs.push(`${vp.name} 横向溢出 ${ov.length} 处：${ov.slice(0, 2).join(' | ')}`)
    notes.push(`${vp.name} Hero 左边缘 ${m.heroLeft}`)
  }
  probs.length
    ? fail('5', '版式纪律与禁用清单', probs.join('\n      '))
    : pass(
        '5',
        '版式纪律与禁用清单',
        `三个断点：Hero 全部左对齐（${notes.join('、')}）、0 章节编号、0 等宽三列栅格、0 装饰圆点、0 emoji、0 滚动提示、锚点栏 ${CHAPTERS.length} 项、0 CTA 折行、0 横向溢出`,
      )
}

/* === 6. prefers-reduced-motion 降级 ==================================
   关了动效之后：3D 不点火、GSAP 场景一个都不建、所有入场元素落终态可见、
   横推退回原生横滑、案例卡不带任何 transform。 */
{
  const probs = []
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  const errs = []
  const chunks = []
  page.on('response', (r) => chunks.push(r.url()))
  page.on('pageerror', (e) => errs.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1800)
  await scrollThrough(page)
  await page.waitForTimeout(1200)

  const m = await page.evaluate(() => {
    const reveals = [...document.querySelectorAll('.rise, .wipe, .swing, [data-stagger]')]
    const canvas = document.querySelector('canvas#stage')
    return {
      reveals: reveals.length,
      hidden: reveals
        .filter((e) => Number(getComputedStyle(e).opacity) < 0.9)
        .map((e) => e.className)
        .slice(0, 5),
      canvasW: canvas ? canvas.width : -1,
      jsPan: document.querySelectorAll('.works__rail.js-pan').length,
      scroller: document.querySelector('.works__scroller')
        ? getComputedStyle(document.querySelector('.works__scroller')).overflowX
        : 'missing',
      cardTransforms: [...document.querySelectorAll('.stack-card')]
        .map((c) => getComputedStyle(c).transform)
        .filter((t) => t !== 'none').length,
      plateOn: document.querySelectorAll('.stage__plate.is-on').length,
    }
  })
  const ov = await page.evaluate(findOverflow)
  await ctx.close()

  const three = chunks.filter((u) => /\/three-|\/gsap-/.test(u))
  if (m.hidden.length) probs.push(`${m.hidden.length}/${m.reveals} 个入场元素停在 opacity<0.9：${m.hidden.join(' | ')}`)
  if (m.canvasW > 400) probs.push(`降级下 3D 仍点火了（canvas.width=${m.canvasW}）`)
  if (three.length) probs.push(`降级下仍拉了动效包：${three.map((u) => u.split('/').pop()).join(' | ')}`)
  if (m.jsPan) probs.push('降级下横推仍被 JS 接管（.js-pan 还在）')
  if (!/auto|scroll/.test(m.scroller)) probs.push(`降级后未退回原生横滑：overflow-x=${m.scroller}`)
  if (m.cardTransforms) probs.push(`${m.cardTransforms} 张案例卡带着 transform（堆叠动效没停）`)
  if (m.plateOn !== 1) probs.push(`降级下应恰好显示 1 张舞台图版，实得 ${m.plateOn}`)
  if (ov.length) probs.push(`横向溢出 ${ov.length} 处：${ov.slice(0, 2).join(' | ')}`)
  if (errs.length) probs.push(`运行时错误：${errs.slice(0, 3).join(' | ')}`)

  probs.length
    ? fail('6', 'prefers-reduced-motion 降级', probs.join('; '))
    : pass(
        '6',
        'prefers-reduced-motion 降级',
        `0 个 3D canvas、0 个 gsap/three 请求、${m.reveals} 个入场元素全部可见、横推退回 overflow-x:${m.scroller}、案例卡 0 transform、1 张图版兜底、0 溢出 0 错误`,
      )
}

/* === 7. 八章构图去重与内容密度 =======================================
   「模板化布局」这件事没法靠眼睛长期守住，所以把每章的构图量化成六元组：
   对齐位置 / 文本宽度 / 栅格列数 / 标题高度位置 / 内容原子数 / 色调。
   八章的指纹必须两两不同，且不能有三章共用同一套（对齐 + 列数 + 标题位）。
   顺带卡内容密度：一章的内容包围盒占不到视口 35%，那就是「空得没有重点」。 */
{
  const probs = []
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await scrollThrough(page)
  await page.waitForTimeout(600)

  const prints = []
  for (const c of CHAPTERS) {
    await page.evaluate((id) => {
      const el = document.getElementById(id)
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
    }, c.id)
    await page.waitForTimeout(700)
    prints.push(
      await page.evaluate((id) => {
        const sec = document.getElementById(id)
        const vw = window.innerWidth
        const vh = window.innerHeight
        const q = (n) => Math.round(n * 20) / 20
        const atoms = [...sec.querySelectorAll('*')].filter((el) =>
          [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()),
        )
        const rects = atoms
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < vh)
        const left = rects.length ? Math.min(...rects.map((r) => Math.max(0, r.left))) : 0
        const right = rects.length ? Math.max(...rects.map((r) => Math.min(vw, r.right))) : 0
        const top = rects.length ? Math.min(...rects.map((r) => Math.max(0, r.top))) : 0
        const bot = rects.length ? Math.max(...rects.map((r) => Math.min(vh, r.bottom))) : 0
        const hull = rects.length ? ((right - left) * (bot - top)) / (vw * vh) : 0
        let cols = 0
        for (const el of sec.querySelectorAll('*')) {
          const cs = getComputedStyle(el)
          if (cs.display !== 'grid') continue
          const n = cs.gridTemplateColumns.split(' ').filter(Boolean).length
          if (n > cols) cols = n
        }
        const head = sec.querySelector('.hd, .hero__title')
        const headY = head ? q((head.getBoundingClientRect().top - sec.getBoundingClientRect().top) / vh) : -1
        return {
          id,
          tone: sec.dataset.tone || '-',
          align: q(left / vw),
          measure: q((right - left) / vw),
          cols,
          headY,
          atoms: Math.round(Math.log2(Math.max(1, atoms.length)) * 2) / 2,
          hull: +hull.toFixed(3),
        }
      }, c.id),
    )
  }
  await ctx.close()

  for (const p of prints) {
    const want = CHAPTERS.find((c) => c.id === p.id)
    if (want && p.tone !== want.tone) probs.push(`#${p.id} 色调 ${p.tone}，期望 ${want.tone}`)
    if (p.hull < 0.35) probs.push(`#${p.id} 内容只占视口 ${(p.hull * 100).toFixed(0)}%（< 35%，太空）`)
  }
  const key = (p) => `${p.align}|${p.measure}|${p.cols}|${p.headY}|${p.atoms}|${p.tone}`
  const seen = new Map()
  for (const p of prints) {
    const k = key(p)
    if (seen.has(k)) probs.push(`#${p.id} 与 #${seen.get(k)} 构图指纹完全相同：${k}`)
    else seen.set(k, p.id)
  }
  const trip = new Map()
  for (const p of prints) {
    const t = `${p.align}|${p.cols}|${p.headY}`
    trip.set(t, [...(trip.get(t) || []), p.id])
  }
  for (const [t, ids] of trip) if (ids.length > 2) probs.push(`${ids.length} 章共用同一套对齐/列数/标题位（${t}）：${ids.join(' ')}`)

  const sheet = prints
    .map((p) => `${p.id} 对齐${p.align} 宽${p.measure} ${p.cols}列 标题位${p.headY} 占屏${(p.hull * 100).toFixed(0)}%`)
    .join(' · ')
  probs.length
    ? fail('7', '八章构图去重与密度', [...probs, `实测：${sheet}`].join('\n      '))
    : pass('7', '八章构图去重与密度', sheet)
}

/* === 8. 外链可达性 =================================================== */
if (!SKIP_LINKS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await scrollThrough(page)
  const all = await page.evaluate(() =>
    Array.from(new Set(Array.from(document.querySelectorAll('a[href^="http"]')).map((a) => a.href))),
  )
  await ctx.close()
  // 同一台主机上的一串文章链接全打过去会被边缘节点限流误判成死链，按主机抽样
  const byHost = new Map()
  for (const h of all) {
    const host = new URL(h).host
    byHost.set(host, [...(byHost.get(host) || []), h])
  }
  const hrefs = []
  for (const [, list] of byHost) {
    if (list.length <= 8) hrefs.push(...list)
    else {
      const step = Math.ceil(list.length / 8)
      hrefs.push(...list.filter((_, i) => i % step === 0).slice(0, 8))
    }
  }
  const UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'
  const hit = (h) => {
    try {
      return Number(
        execFileSync('curl', ['-sSL', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '25', '-A', UA, h], {
          encoding: 'utf8',
        }).trim(),
      )
    } catch {
      return 0
    }
  }
  // 反爬墙不是死链。B 站空间页对机房 IP 一律回 412「出错啦!」，换成真浏览器
  // 导航同样是 412——这台机器根本没法验证它，判死是错的，判活也是错的。
  // 所以 401/403/412/429/451/999 单独列成「机器不可验证」，不计入失败，
  // 但会原样打出来要求人工过一眼。真正的 404/410/5xx/连不上仍然判失败。
  const WALLED = new Set([401, 403, 412, 429, 451, 999])
  const dead = []
  const walled = []
  await Promise.all(
    hrefs.map(async (h) => {
      let code = hit(h)
      for (let i = 0; i < 2 && (code === 0 || code === 429 || code >= 500); i++) {
        await new Promise((r) => setTimeout(r, 2500 * (i + 1)))
        code = hit(h)
      }
      if (code === 0) dead.push(`ERR ${h}`)
      else if (WALLED.has(code)) walled.push(`${code} ${h}`)
      else if (code >= 400) dead.push(`${code} ${h}`)
    }),
  )
  const wallNote = walled.length ? `\n      机器不可验证（反爬墙，需人工过目）:\n      ${walled.join('\n      ')}` : ''
  dead.length
    ? fail('8', '外链可达', `${dead.length}/${hrefs.length} 不可达:\n      ${dead.join('\n      ')}${wallNote}`)
    : pass(
        '8',
        '外链可达',
        `${hrefs.length - walled.length}/${hrefs.length} 个链接 <400（按 ${byHost.size} 台主机各抽 ≤8 条，共 ${all.length} 条）${wallNote}`,
      )
} else {
  pass('8', '外链可达', 'skipped')
}

/* === 11. 3D 能力分级与降级 ===========================================
   3D 只有在「跑得动 + 没关动效 + 屏幕够宽」时才该出现。这一关守三件事：
   低端路径完全不拉 three、强开时确实点着、点着之后静态图版必须让位。 */
{
  const probs = []
  const readOne = async (opts, q) => {
    const ctx = await browser.newContext(opts)
    const page = await ctx.newPage()
    const urls = []
    page.on('response', (r) => urls.push(r.url()))
    await page.goto(q ? withQ(URL_BASE, q) : URL_BASE, { waitUntil: 'load' })
    await page.waitForTimeout(4500)
    const m = await page.evaluate(() => {
      const c = document.querySelector('canvas#stage')
      return {
        canvasW: c ? c.width : -1,
        plateOn: document.querySelectorAll('.stage__plate.is-on').length,
      }
    })
    await ctx.close()
    return { ...m, three: urls.filter((u) => /\/three-/.test(u)).length }
  }

  const mobile = await readOne({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const desktop = await readOne({ viewport: { width: 1440, height: 900 } })
  const forced = await readOne({ viewport: { width: 1440, height: 900 } }, 'gl=1')

  if (mobile.three) probs.push(`手机档仍下载了 three（${mobile.three} 个请求）`)
  if (mobile.canvasW > 400) probs.push(`手机档点火了 3D（canvas.width=${mobile.canvasW}）`)
  if (mobile.plateOn !== 1) probs.push(`手机档应显示 1 张图版，实得 ${mobile.plateOn}`)
  if (!forced.three) probs.push('?gl=1 强开后没有加载 three')
  if (forced.canvasW <= 400) probs.push(`?gl=1 强开后 3D 未点火（canvas.width=${forced.canvasW}）`)
  if (forced.plateOn !== 0) probs.push(`3D 点着后仍有 ${forced.plateOn} 张图版没让位`)

  // three 不能出现在首屏关键路径里
  const html = await readFile(path.join(DIST, 'index.html'), 'utf8')
  if (/three-[\w-]+\.js/.test(html)) probs.push('index.html 里直接引了 three chunk（进了首屏关键路径）')

  probs.length
    ? fail('11', '3D 能力分级与降级', probs.join('; '))
    : pass(
        '11',
        '3D 能力分级与降级',
        `手机档 0 个 three 请求 + 图版兜底；默认桌面档 three=${desktop.three} canvas=${desktop.canvasW}；` +
          `?gl=1 强开点火成功（canvas.width=${forced.canvasW}）且图版全部让位；three 不在首屏关键路径`,
      )
}

/* === 12. 作品横推与案例堆叠 ==========================================
   两个招牌交互，坏了必须当场知道：横推靠 sticky + scrub（不是 pin），
   案例堆叠靠 CSS sticky + scale/--sink 遮片。窄屏两者都要静态化。 */
{
  const probs = []
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1800)

  const railTop = await page.evaluate(() => {
    const el = document.querySelector('.works__rail')
    return el ? el.getBoundingClientRect().top + window.scrollY : -1
  })
  const samples = []
  for (const f of [0.1, 0.55, 1]) {
    await page.evaluate(
      ([top, frac]) => {
        const el = document.querySelector('.works__rail')
        const h = el ? el.offsetHeight - window.innerHeight : 0
        window.scrollTo({ top: top + h * frac, behavior: 'instant' })
      },
      [railTop, f],
    )
    // scrub:1 追平要一秒，末点多等一会儿再读
    await page.waitForTimeout(f === 1 ? 2200 : 700)
    samples.push(
      await page.evaluate(() => {
        const t = document.querySelector('.works__track')
        const mx = new DOMMatrixReadOnly(getComputedStyle(t).transform)
        return +mx.m41.toFixed(1)
      }),
    )
  }
  // 走到尽头时末卡必须整张在画面里，而且右边留白要跟开头的 --gutter 对得上。
  // scrollWidth 在子元素溢出时会丢掉容器的 padding-inline-end，行程算少了
  // 就会让末卡贴死右边缘——这条断言专门盯这个。
  const tail = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.work')]
    const last = cards[cards.length - 1]
    const track = document.querySelector('.works__track')
    return {
      name: last?.querySelector('.work__name, h3')?.textContent?.trim().slice(0, 16) || '?',
      gap: +(window.innerWidth - last.getBoundingClientRect().width - last.getBoundingClientRect().left).toFixed(1),
      gutter: +(parseFloat(getComputedStyle(track).paddingInlineEnd) || 0).toFixed(1),
    }
  })
  const jsPan = await page.evaluate(() => document.querySelectorAll('.works__rail.js-pan').length)

  // 案例堆叠：滚到第二张卡压上来时，第一张必须已经被缩小并压暗
  await page.evaluate(() => {
    const cards = document.querySelectorAll('.stack-card')
    if (cards.length > 1) {
      const t = cards[1].getBoundingClientRect().top + window.scrollY
      window.scrollTo({ top: t - 40, behavior: 'instant' })
    }
  })
  await page.waitForTimeout(900)
  const stack = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.stack-card')]
    if (!cards.length) return null
    const first = cards[0].querySelector('.case') || cards[0]
    const mx = new DOMMatrixReadOnly(getComputedStyle(cards[0]).transform)
    return {
      n: cards.length,
      scale: +mx.a.toFixed(3),
      sink: getComputedStyle(first).getPropertyValue('--sink').trim(),
      sticky: getComputedStyle(cards[0]).position,
    }
  })
  await ctx.close()

  // 窄屏静态化
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page2 = await ctx2.newPage()
  await page2.goto(URL_BASE, { waitUntil: 'load' })
  await page2.waitForTimeout(1500)
  await scrollThrough(page2)
  const narrow = await page2.evaluate(() => ({
    scroller: document.querySelector('.works__scroller')
      ? getComputedStyle(document.querySelector('.works__scroller')).overflowX
      : 'missing',
    cardPos: document.querySelector('.stack-card')
      ? getComputedStyle(document.querySelector('.stack-card')).position
      : 'missing',
  }))
  await ctx2.close()

  if (!jsPan) probs.push('桌面端横推没被接管（.works__rail 上没有 js-pan）')
  const moved = Math.abs(samples[2] - samples[0])
  if (moved < 200) probs.push(`横推行程只有 ${moved}px（样本 ${samples.join(' → ')}）`)
  if (!(samples[0] > samples[1] && samples[1] > samples[2])) probs.push(`横推方向不单调：${samples.join(' → ')}`)
  if (tail.gap < tail.gutter * 0.7)
    probs.push(`横推走完末卡「${tail.name}」右侧只剩 ${tail.gap}px，应约等于左侧 --gutter ${tail.gutter}px`)
  if (!stack) probs.push('找不到案例堆叠卡')
  else {
    if (stack.n !== 3) probs.push(`案例卡 ${stack.n} 张，期望 3 张`)
    if (stack.sticky !== 'sticky') probs.push(`案例卡不是 sticky（position=${stack.sticky}）`)
    if (!(stack.scale < 0.995)) probs.push(`第二张压上来时第一张没缩小（scale=${stack.scale}）`)
  }
  if (!/auto|scroll/.test(narrow.scroller)) probs.push(`窄屏横推未退回原生横滑：overflow-x=${narrow.scroller}`)
  if (narrow.cardPos !== 'static') probs.push(`窄屏案例卡未静态化（position=${narrow.cardPos}）`)

  probs.length
    ? fail('12', '作品横推与案例堆叠', probs.join('; '))
    : pass(
        '12',
        '作品横推与案例堆叠',
        `横推 ${samples.join(' → ')}（行程 ${moved}px，单调左移；末卡「${tail.name}」右留白 ${tail.gap}px vs 左 --gutter ${tail.gutter}px）· 案例 ${stack.n} 张 sticky 卡，第二张压上时首张 scale=${stack.scale}、--sink=${stack.sink} · 窄屏退回 overflow-x:${narrow.scroller} + position:static`,
      )
}

/* === 10. 滚动手感 ====================================================
   「滑动阻尼一塌糊涂」没法靠肉眼验收，所以逐帧记录位移，把手感拆成
   跟手 / 超调 / 停稳 / 平滑度 / 掉帧几个量（实现见 scroll-feel.mjs）。

   两条定标经验：
   a) 停稳判毫秒，不判帧。lenis 用帧率无关阻尼，时间常数在秒域。
   b) jerk 要跟「输入自己的 jerk」比。同一条录像里 tg 是未平滑的原始输入，
      它自带 rAF 计时噪声；只有输出明显放大了输入，才算站点在抖。 */
{
  const { measure, LAUNCH_ARGS } = await import('./scroll-feel.mjs')
  const b = await chromium.launch({ args: LAUNCH_ARGS })
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const now = await measure(page, URL_BASE)
  await b.close()

  const probs = []
  let line = ''
  if (now.error) {
    probs.push(`采样失败：${now.error}（${now.frames} 帧）`)
  } else {
    const jerkCap = Math.max(0.12, now.inJerkRatio * 2.5)
    if (now.overshootPct > 2) probs.push(`超调 ${now.overshootPct}% > 2%（回弹了）`)
    if (now.settleMs < 0) probs.push('静置段没测到停稳点')
    if (now.settleMs > 1200) probs.push(`停稳 ${now.settleMs}ms > 1200ms（尾巴太长）`)
    if (now.lagPx > 260) probs.push(`跟手 ${now.lagPx}px > 260px（太钝）`)
    if (now.jerkRatio > jerkCap) probs.push(`速度 jerk ${now.jerkRatio} > ${jerkCap.toFixed(3)}（输入自带 ${now.inJerkRatio}）`)
    if (now.worstDropRun >= 3) probs.push(`连续掉帧 ${now.worstDropRun} 帧 ≥ 3`)
    if (now.medianDt > now.baseDt * 1.35)
      probs.push(`滚动时 ${now.medianDt}ms/帧，比空转基线 ${now.baseDt}ms 贵 35% 以上`)
    line =
      `${now.medianDt}ms/帧（空转基线 ${now.baseDt}ms）· 跟手 ${now.lagPx}px · 超调 ${now.overshootPct}% · ` +
      `停稳 ${now.settleMs}ms · jerk ${now.jerkRatio}（输入 ${now.inJerkRatio}，上限 ${jerkCap.toFixed(3)}）· ` +
      `掉帧连跑 ${now.worstDropRun}\n      抖动率仅记录：${now.flipRate}（计数型，样本少，不作门槛）`
  }
  probs.length ? fail('10', '滚动手感', `${line}\n      未达标: ${probs.join('; ')}`) : pass('10', '滚动手感', line)
}

/* === 9. 字体子集覆盖 + 预算 + 设计系统硬规则 ==========================
   每个字族各有一份子集，漏一个字就当场掉回系统字。
   顺带卡死两条 brand-dna 规则：0 处 Inter、index.css 里 0 处硬编码品牌色。 */
{
  const FONTS = path.join(ROOT, 'public', 'fonts')
  const CHARS = path.join(ROOT, 'scripts', 'chars')
  // 页面上的字族 → 子集字符表。等宽 / 手写 / 读数这三档不含汉字，
  // 汉字按字族链退给中文字体，所以它们的表里本来就带着那些汉字，照查即可。
  const FAMILY = {
    'noto serif sc web': 'serif',
    'noto sans sc web': { 400: 'sans-regular', 650: 'sans-semibold' },
    'fraunces web': 'num',
    'jetbrains mono web': 'mono',
    'caveat web': 'hand',
  }
  const tables = {}
  for (const f of await readdir(CHARS)) {
    if (f.endsWith('.txt')) tables[f.replace('.txt', '')] = new Set(await readFile(path.join(CHARS, f), 'utf8'))
  }
  const missing = {}
  const b = await chromium.launch()
  for (const route of ROUTES) {
    for (const vp of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      const pg = await b.newPage({ viewport: vp })
      await pg.goto(URL_BASE + route, { waitUntil: 'networkidle' })
      await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await pg.waitForTimeout(800)
      const got = await pg.evaluate(() => {
        const out = {}
        for (const el of document.querySelectorAll('body *')) {
          const cs = getComputedStyle(el)
          const fam = String(cs.fontFamily).split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase()
          const w = parseInt(cs.fontWeight, 10) || 400
          const key = `${fam}|${w}`
          for (const n of el.childNodes) {
            if (n.nodeType !== 3 || !n.nodeValue) continue
            out[key] = (out[key] || '') + n.nodeValue
          }
        }
        return out
      })
      for (const [key, text] of Object.entries(got)) {
        const [fam, w] = key.split('|')
        const spec = FAMILY[fam]
        if (!spec) continue
        const bucket = typeof spec === 'string' ? spec : Number(w) >= 600 ? spec[650] : spec[400]
        const table = tables[bucket]
        if (!table) continue
        for (const c of text) {
          if (c.codePointAt(0) <= 32) continue
          if (!table.has(c)) (missing[bucket] ||= new Set()).add(c)
        }
      }
      await pg.close()
    }
  }
  await b.close()

  const probs = []
  for (const [bucket, set] of Object.entries(missing)) probs.push(`${bucket} 子集缺字（会掉回系统字）：${[...set].join('')}`)

  let total = 0
  const inv = []
  for (const f of (await readdir(FONTS)).sort()) {
    if (!f.endsWith('.woff2')) continue
    const kb = (await stat(path.join(FONTS, f))).size / 1024
    total += kb
    inv.push(`${f.replace('.woff2', '')} ${kb.toFixed(0)}`)
  }
  if (total > 200) probs.push(`字体总量 ${total.toFixed(1)} KB > 200 KB 预算`)
  // 每份子集都必须有对应的 OFL 许可证一起发出去
  const files = await readdir(FONTS)
  for (const f of files) {
    if (!f.endsWith('.woff2')) continue
    const base = f.replace(/-(Regular|Semibold|Display|Numerals)?\.woff2$/, '').replace('.woff2', '')
    if (!files.some((x) => x.startsWith('LICENSE-') && x.includes(base))) probs.push(`${f} 缺少同名 LICENSE 文件`)
  }

  const cssRaw = await readFile(path.join(ROOT, 'src', 'styles', 'index.css'), 'utf8')
  // 注释里会引用色号来解释「为什么不能用它」，那是文档不是声明。先整段剥掉，
  // 否则这一关会把自己的设计说明当成违规。
  const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, '')
  const html = await readFile(path.join(ROOT, 'index.html'), 'utf8')
  if (/\bInter\b/.test(css) || /\bInter\b/.test(html)) probs.push('仍有 Inter 引用')
  // palettes.css 是唯一允许写十六进制的地方；index.css 里出现即违规
  const hex = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]).filter((h) => h !== '#000')
  if (hex.length) probs.push(`index.css 里有 ${hex.length} 处硬编码颜色：${hex.slice(0, 6).join(' ')}`)
  if (/color-mix\(/.test(css)) probs.push('index.css 使用了被禁的 color-mix()')

  const covered = Object.entries(tables)
    .map(([k, v]) => `${k} ${v.size}字`)
    .join('、')
  probs.length
    ? fail('9', '字体子集 / 预算 / 设计系统规则', probs.join('\n      '))
    : pass(
        '9',
        '字体子集 / 预算 / 设计系统规则',
        `${covered}；四条路由 × 两个断点 0 缺字。总量 ${total.toFixed(1)} KB ≤ 200 KB（${inv.join(' · ')}）。0 处 Inter、0 处硬编码色、0 处 color-mix()`,
      )
}

/* === 2. Lighthouse ================================================== */
if (!SKIP_LH) {
  const lighthouse = (await import('lighthouse')).default
  const { launch } = await import('chrome-launcher')
  const chromePath = chromium.executablePath()
  const chrome = await launch({
    chromePath,
    chromeFlags: ['--headless=new', '--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const DESKTOP = {
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
    throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
  }
  // 三轮：默认桌面 / 默认手机 是绝大多数访客拿到的页面，硬门槛照守；
  // gl 轮把 three 真的加载起来跑一遍，只卡下限 + CLS（沙箱是软件光栅，本来就偏悲观）。
  const presets = {
    desktop: { ...DESKTOP, url: URL_BASE, minPerf: 95, hard: true },
    mobile: {
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
      throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4, requestLatencyMs: 562.5, downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675 },
      url: URL_BASE,
      minPerf: 90,
      hard: true,
    },
    'desktop+3d': { ...DESKTOP, url: withQ(URL_BASE, 'gl=1'), minPerf: 85, hard: false },
  }
  const lhOut = {}
  for (const [name, p] of Object.entries(presets)) {
    const r = await lighthouse(
      p.url,
      { port: chrome.port, output: 'json', logLevel: 'error' },
      {
        extends: 'lighthouse:default',
        settings: {
          formFactor: p.formFactor,
          screenEmulation: p.screenEmulation,
          throttling: p.throttling,
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        },
      },
    )
    const c = r.lhr.categories
    const a = r.lhr.audits
    lhOut[name] = {
      perf: Math.round(c.performance.score * 100),
      a11y: Math.round(c.accessibility.score * 100),
      bp: Math.round(c['best-practices'].score * 100),
      seo: Math.round(c.seo.score * 100),
      lcp: +(a['largest-contentful-paint'].numericValue / 1000).toFixed(2),
      cls: +a['cumulative-layout-shift'].numericValue.toFixed(3),
      tbt: Math.round(a['total-blocking-time'].numericValue),
      a11yFails: Object.values(a)
        .filter((x) => x.score === 0 && x.scoreDisplayMode === 'binary' && c.accessibility.auditRefs.some((ar) => ar.id === x.id))
        .map((x) => x.id),
      minPerf: p.minPerf,
      hard: p.hard,
    }
  }
  await chrome.kill()
  await writeFile('/workspace/lighthouse.json', JSON.stringify(lhOut, null, 2))
  const probs = []
  for (const [name, v] of Object.entries(lhOut)) {
    // CLS 和 Perf 下限三轮都要守：3D 是 fixed canvas，本来就不该推动任何东西
    if (v.cls > 0) probs.push(`${name} CLS ${v.cls} > 0`)
    if (v.perf < v.minPerf) probs.push(`${name} Perf ${v.perf} < ${v.minPerf}`)
    if (!v.hard) continue
    if (v.a11y < 96) probs.push(`${name} A11y ${v.a11y} < 96 (${v.a11yFails.join(',') || '-'})`)
    if (v.bp < 100) probs.push(`${name} BP ${v.bp} < 100`)
    if (v.seo < 92) probs.push(`${name} SEO ${v.seo} < 92`)
    if (v.lcp >= 2.5) probs.push(`${name} LCP ${v.lcp}s ≥ 2.5`)
    if (v.tbt > (name === 'mobile' ? 150 : 50)) probs.push(`${name} TBT ${v.tbt}ms 超标`)
  }
  const line = Object.entries(lhOut)
    .map(
      ([n, v]) =>
        `${n.padEnd(11)} Perf ${String(v.perf).padStart(3)} / A11y ${v.a11y} / BP ${v.bp} / SEO ${v.seo} · LCP ${v.lcp}s · CLS ${v.cls} · TBT ${v.tbt}ms${v.hard ? '' : ' (仅记录)'}`,
    )
    .join('\n      ')
  probs.length ? fail('2', 'Lighthouse', `${line}\n      未达标: ${probs.join('; ')}`) : pass('2', 'Lighthouse', line)
} else {
  pass('2', 'Lighthouse', 'skipped')
}

await browser.close()
server.close()

results.sort((a, b) => Number(a.id) - Number(b.id)) // 字符串排序会把 '10' 排到 '2' 前面
console.log('\n──────────── 验收结果 ────────────')
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id}. ${r.name}\n      ${r.detail}`)
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} 通过`)
await writeFile('/workspace/audit.json', JSON.stringify({ results, contrastReport }, null, 2))
process.exit(failed.length ? 1 : 0)
