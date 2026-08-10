/**
 * 上线前自动验收。二十二关，任何一关 fail 都让进程以非零码退出。
 *
 *  1 子路径部署与解码   2 Lighthouse          3 对比度矩阵
 *  4 破折号             5 版式纪律与禁用清单   6 reduced-motion 降级
 *  7 章节密度与色调     8 外链可达             9 字体子集 / 预算 / 设计系统规则
 * 10 滚动手感          11 CSS 3D 与指针视差    12 作品横推与案例堆叠
 * 13 视觉证据          14 遮挡                15 形状锁
 * 16 章间差异度        17 配色纪律            18 AI 味扫描
 * 19 首屏承载        20 零位图              21 移动端可用性（双引擎）
 * 22 可点性
 *
 * 用法：node scripts/audit.mjs [--skip-lh] [--skip-links] [--only=1,13,19]
 *
 * v7 说明：1-12 是从 v6 继承下来的「对不对」，13-19 是这一版新加的「好不好看」。
 * v6 的教训是十二关全绿但页面很丑——因为没有一关在量构图、密度、遮挡和纪律。
 * 13-19 全部是可判定的几何与字符断言，不是主观描述。
 */
import { chromium, webkit } from 'playwright'
import { readFile, readdir, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { serveDist } from './lib/serve.mjs'
import { findOverflow } from './lib/overflow.mjs'

const ROOT = new URL('../', import.meta.url).pathname
const DIST = path.join(ROOT, 'dist')
const SKIP_LH = process.argv.includes('--skip-lh')
const SKIP_LINKS = process.argv.includes('--skip-links')
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').replace('--only=', '')
const only = ONLY ? new Set(ONLY.split(',').map((s) => s.trim())) : null
const SELF_TEST = process.argv.includes('--self-test')
const want = (id) => !only || only.has(String(id))

/** 六章。顺序、id、色调都跟 content/site.ts 对齐，错一个就说明内容层被改过。 */
const CHAPTERS = [
  { id: 'hero', tone: 'paper' },
  { id: 'craft', tone: 'yellow' },
  { id: 'work', tone: 'blue' },
  { id: 'cases', tone: 'sand' },
  { id: 'notes', tone: 'paper' },
  { id: 'contact', tone: 'coral' },
]
const ROUTES = ['', 'case/lofi/', 'case/repair/', 'case/video-vip/']

/** 当前色板的全部色值。v8 这里是写死的 palette A 常量，换到 E 组之后它就成了
    一份必然过期的副本；v9 改成运行时从 :root 读，色板换组不用再改审计脚本。
    只在需要时抓一次，抓完缓存。 */
let PALETTE = null
const PALETTE_VARS = [
  '--brand', '--brand-deep', '--brand-tint',
  '--highlight', '--highlight-soft', '--warning', '--warning-soft',
  '--pop', '--pop-deep', '--pop-soft', '--success', '--success-soft',
  '--cream', '--cream-dark', '--card-bg', '--preview-bg',
  '--ink', '--ink-light', '--ink-faint', '--dark-panel',
  '--on-brand', '--on-pop', '--on-dark-dim',
]
async function loadPalette(browser) {
  if (PALETTE) return PALETTE
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(URL_BASE, { waitUntil: 'load' })
  const vals = await page.evaluate((vars) => {
    const cs = getComputedStyle(document.documentElement)
    const out = {}
    for (const v of vars) {
      const raw = cs.getPropertyValue(v).trim()
      if (raw) out[v] = raw
    }
    return out
  }, PALETTE_VARS)
  await ctx.close()
  const norm = (s) => {
    if (s.startsWith('#')) return s.length === 4 ? '#' + [...s.slice(1)].map((c) => c + c).join('').toUpperCase() : s.toUpperCase()
    const n = (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number)
    return n.length === 3 ? hex({ r: n[0], g: n[1], b: n[2] }) : null
  }
  PALETTE = { map: vals, set: new Set(Object.values(vals).map(norm).filter(Boolean)), hexOf: {} }
  for (const [k, v] of Object.entries(vals)) PALETTE.hexOf[k] = norm(v)
  PALETTE.set.add('#FFFFFF')
  return PALETTE
}

const { server, url: URL_BASE } = await serveDist({ dist: DIST, port: 4199 })

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
const hex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()

/* ------------------------------------------------------------------ */
/* 页面内采集：文本节点标记 + 可见性 + 背景栈                            */
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
    if (idx < 0) return
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
    /* opacity 要折进前景 alpha。v9 之前这里只读 cs.color，于是
       `opacity:.72` 的标签计数、`opacity:.78` 的花园小标签全被判合格，
       Lighthouse 的 axe 却照报不误 —— 那三处是真的没到 AA。
       元素自身与祖先的 opacity 连乘，等价于把文字按这个 alpha 合成到底色上。 */
    let op = 1
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const o = Number(getComputedStyle(n).opacity)
      if (Number.isFinite(o)) op *= o
    }
    const fg0 = norm(cs.color)
    out.push({
      tag: el.tagName.toLowerCase(),
      cls: typeof el.className === 'string' ? el.className.slice(0, 90) : '',
      text: (el.textContent || '').trim().slice(0, 40),
      fg: fg0 ? { ...fg0, a: +(fg0.a * op).toFixed(4) } : fg0,
      opacity: +op.toFixed(3),
      stack,
      size: parseFloat(cs.fontSize),
      weight: Number(cs.fontWeight) || 400,
    })
  })
  return out
}

/* ------------------------------------------------------------------ */
/** 竖向 + 横向全量清扫。横向那一半是必须的：作品跑道在窄屏是原生横滚容器，
 *  右边两张卡从来没进过视口，lazy 图当然不会解码——不扫就会误判成死图。 */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.6)
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 130))
    }
    window.scrollTo(0, document.body.scrollHeight)
    await new Promise((r) => setTimeout(r, 500))
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const els = Array.from(document.querySelectorAll('*')).filter(
      (e) => e.scrollWidth - e.clientWidth > 40 && ['auto', 'scroll'].includes(getComputedStyle(e).overflowX),
    )
    for (const e of els) {
      // 先把容器竖直方向带进视口：横滚容器整体在视口外时，lazy 图不会解码
      const top = e.getBoundingClientRect().top + window.scrollY
      window.scrollTo(0, Math.max(0, top - window.innerHeight * 0.2))
      await sleep(340)
      const max = e.scrollWidth - e.clientWidth
      for (let x = 0; x <= max; x += Math.max(140, e.clientWidth * 0.6)) {
        e.scrollLeft = x
        await sleep(120)
      }
      e.scrollLeft = max
      await sleep(280)
      e.scrollLeft = 0
      await sleep(120)
    }
    window.scrollTo(0, document.body.scrollHeight)
    await sleep(600)
  })
}

async function collectContrast(page) {
  const total = await page.evaluate(COLLECT_SETUP)
  const rows = []
  const H = page.viewportSize().height
  const doc = await page.evaluate(() => document.body.scrollHeight)
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

/** 把某一章滚到视口顶部。lenis 接管后 scrollIntoView 无效，只能算绝对位置。 */
const goto = async (page, id, off = 0) => {
  await page.evaluate(
    ([i, o]) => {
      const el = document.getElementById(i)
      if (!el) return
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + o, behavior: 'instant' })
    },
    [id, off],
  )
  await page.waitForTimeout(650)
}

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })

/* === 1. 子路径部署可用 =============================================== */
if (want(1)) {
  const probs = []
  let imgCount = 0
  let sections = 0
  let shots = 0
  for (const route of ROUTES) {
    for (const vp of [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
      const page = await ctx.newPage()
      const bad = []
      const errs = []
      page.on('response', (r) => {
        if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`)
      })
      page.on('pageerror', (e) => errs.push(String(e)))
      page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
      await page.goto(URL_BASE + route, { waitUntil: 'load' })
      await page.waitForTimeout(1800)
      await scrollThrough(page)
      await page.waitForTimeout(900)
      const shot = await page.evaluate(() => ({
        sections: document.querySelectorAll('#root section[id]').length,
        imgs: document.querySelectorAll('img').length,
        shots: document.querySelectorAll('img').length,
      }))
      const broken = await page.evaluate(() =>
        [...document.querySelectorAll('img')]
          .filter((i) => !(i.complete && i.naturalWidth > 0))
          .map((i) => (i.currentSrc || i.src).split('/').pop()),
      )
      const tag = `${route || '/'}@${vp.name}`
      if (bad.length) probs.push(`${tag} 有 ${bad.length} 个 4xx：${bad.slice(0, 3).join(' | ')}`)
      if (errs.length) probs.push(`${tag} 运行时错误：${errs.slice(0, 2).join(' | ')}`)
      if (broken.length) probs.push(`${tag} ${broken.length} 张图解码失败：${broken.slice(0, 3).join(' | ')}`)
      if (!route && vp.name === 'desktop') {
        sections = shot.sections
        shots = shot.shots
        if (shot.sections !== CHAPTERS.length) probs.push(`首页 ${shot.sections} 个 section，期望 ${CHAPTERS.length}`)
      }
      if (vp.name === 'desktop') imgCount += shot.imgs
      await ctx.close()
    }
  }
  probs.length
    ? fail('1', '子路径部署 (/website/)', probs.join('\n      '))
    : pass(
        '1',
        '子路径部署 (/website/)',
        `${ROUTES.length} 条路由 × 2 断点、${sections} 个章节、${imgCount} 张位图（首页 ${shots} 张不重复截图）全部解码、0 个 4xx、0 个运行时错误`,
      )
}

/* === 3. 对比度矩阵 =================================================== */
const contrastReport = []
let missedTotal = 0
if (want(3) || want(17)) {
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
        reducedMotion: 'reduce',
      })
      const page = await ctx.newPage()
      await page.goto(URL_BASE + target.route, { waitUntil: 'load' })
      await page.waitForTimeout(1600)
      await scrollThrough(page)
      const { rows, missed } = await collectContrast(page)
      missedTotal += missed
      for (const n of rows) {
        if (!n.fg || !n.stack.length) continue
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
          bgHex: hex(bg),
          size: n.size,
          weight: n.weight,
          large,
          ratio: +r.toFixed(2),
          need,
          ok: r >= need - 0.005,
        })
      }
      await ctx.close()
    }
  }
}
if (want(3)) {
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

/* === 4. 破折号 / 连接号（源码层，零容忍） ============================
   v6 允许「——」当中文破折号；v7 不允许。这是设计纪律不是标点纪律：
   破折号是 AI 文风最强的单一指纹，一个都不留，该断句就断句。
   注释里的说明文字不进 DOM，不算。 */
if (want(4)) {
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
  let inBlock = false
  for (const f of files) {
    if (path.basename(f) === 'palettes.css') continue // 原样搬自设计系统，不改一个字
    const txt = await readFile(f, 'utf8')
    inBlock = false
    txt.split('\n').forEach((line, i) => {
      let code = line
      if (inBlock) {
        const end = code.indexOf('*/')
        if (end < 0) return
        code = code.slice(end + 2)
        inBlock = false
      }
      code = code.replace(/\/\*[\s\S]*?\*\//g, '')
      const open = code.indexOf('/*')
      if (open >= 0) {
        inBlock = true
        code = code.slice(0, open)
      }
      code = code.replace(/\/\/.*$/, '').replace(/<!--[\s\S]*$/, '')
      if (/[\u2014\u2013]/.test(code)) hits.push(`${path.relative(ROOT, f)}:${i + 1} ${line.trim().slice(0, 70)}`)
    })
  }
  hits.length
    ? fail('4', '无 — / – 破折号（零容忍）', hits.join('\n      '))
    : pass('4', '无 — / – 破折号（零容忍）', `扫描 ${files.length} 个文件的非注释代码，0 命中`)
}

/* === 5. 版式纪律与禁用清单 ==========================================
   居中平庸 Hero、章节编号 eyebrow、一行三张等宽卡、装饰圆点、emoji、
   滚动提示、CTA 折行，外加三个断点 0 横向溢出。 */
if (want(5)) {
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
      const title = document.querySelector('.hero__h')
      const tRect = title ? title.getBoundingClientRect() : null
      const heroCentered =
        !title || getComputedStyle(title).textAlign === 'center' || (tRect && tRect.left / vw > 0.25)

      // 章节编号 eyebrow。cases 的 01/02/03 是 .case__no，本来就该编号，白名单放行
      const numbered = [...document.querySelectorAll('.eyebrow')]
        .map((h) => (h.innerText || '').trim())
        .filter((t) => /^\d{2}\b/.test(t))

      // 一行三张等宽卡：按渲染出来的行分组，不看 grid-template
      const evenRows = []
      for (const el of document.querySelectorAll('#root *')) {
        const cs = getComputedStyle(el)
        if (!['grid', 'flex'].includes(cs.display)) continue
        // 横滚跑道豁免：被禁的是「静态一行三张等宽卡」这种模板构图，
        // 不是可横向翻的轨道 —— snap 轨道本来就该是等宽序列，不规则会翻得顿。
        // 判据是「声明了横向 snap」或「当前真的横向溢出」，不是看它这一刻装不装得下。
        if (/^x\b/.test(cs.scrollSnapType)) continue
        if (['auto', 'scroll'].includes(cs.overflowX) && el.scrollWidth - el.clientWidth > 40) continue
        const kids = [...el.children].filter((k) => {
          const r = k.getBoundingClientRect()
          return r.width > 40 && r.height > 40
        })
        if (kids.length < 3) continue
        const rows = new Map()
        for (const k of kids) {
          const r = k.getBoundingClientRect()
          const key = Math.round(r.top / 8)
          rows.set(key, [...(rows.get(key) || []), r.width])
        }
        for (const [, ws] of rows) {
          if (ws.length < 3) continue
          if (Math.max(...ws) - Math.min(...ws) < 2) evenRows.push(`${el.className || el.tagName}:${ws.length}张`)
        }
      }

      // 装饰圆点：正圆、自己和父级都没有文字
      const dots = []
      for (const el of document.querySelectorAll('#root *')) {
        const r = el.getBoundingClientRect()
        if (r.width < 3 || r.width > 14 || Math.abs(r.width - r.height) > 1) continue
        const cs = getComputedStyle(el)
        if (!/50%|9999px|999px/.test(cs.borderRadius)) continue
        if ((el.textContent || '').trim()) continue
        if ((el.parentElement?.textContent || '').trim()) continue
        dots.push(el.className || el.tagName)
      }

      return {
        heroCentered,
        heroLeft: tRect ? +(tRect.left / vw).toFixed(3) : -1,
        numbered,
        evenRows: [...new Set(evenRows)],
        dots: [...new Set(dots)],
        emoji: (txt.match(/[\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2700}-\u{27BF}\u{FE0F}]/gu) || []).slice(0, 6),
        scrollHint: (txt.match(/向下滚|往下滚|滚动查看|scroll\s*down|↓/gi) || []).slice(0, 4),
        ctaWrapped: [...document.querySelectorAll('.hero__cta .btn')].filter((b) => b.getClientRects().length > 1)
          .length,
      }
    })
    const ov = await page.evaluate(findOverflow)
    await ctx.close()

    if (m.heroCentered) probs.push(`${vp.name} Hero 居中或右移（左边缘 ${m.heroLeft}）`)
    if (m.numbered.length) probs.push(`${vp.name} ${m.numbered.length} 处章节编号 eyebrow：${m.numbered.join(' / ')}`)
    if (m.evenRows.length) probs.push(`${vp.name} 一行三张以上等宽卡：${m.evenRows.join(' | ')}`)
    if (m.dots.length) probs.push(`${vp.name} 装饰圆点 ${m.dots.length} 处：${m.dots.join(' | ')}`)
    if (m.emoji.length) probs.push(`${vp.name} emoji ${m.emoji.join('')}`)
    if (m.scrollHint.length) probs.push(`${vp.name} 滚动提示：${m.scrollHint.join(' / ')}`)
    if (m.ctaWrapped) probs.push(`${vp.name} ${m.ctaWrapped} 个 CTA 折行`)
    if (ov.length) probs.push(`${vp.name} 横向溢出 ${ov.length} 处：${ov.slice(0, 2).join(' | ')}`)
    notes.push(`${vp.name} Hero 左边缘 ${m.heroLeft}`)
  }
  probs.length
    ? fail('5', '版式纪律与禁用清单', probs.join('\n      '))
    : pass(
        '5',
        '版式纪律与禁用清单',
        `三个断点：Hero 全部左对齐（${notes.join('、')}）、0 章节编号 eyebrow、0 处静态一行三张等宽卡（横滚跑道豁免）、0 装饰圆点、0 emoji、0 滚动提示、0 CTA 折行、0 横向溢出`,
      )
}

/* === 6. prefers-reduced-motion 降级 ================================== */
if (want(6)) {
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
  await page.waitForTimeout(1000)

  const m = await page.evaluate(() => {
    const reveals = [...document.querySelectorAll('.rise, .wipe, .swing, [data-stagger]')]
    return {
      reveals: reveals.length,
      hidden: reveals
        .filter((e) => Number(getComputedStyle(e).opacity) < 0.9)
        .map((e) => e.className)
        .slice(0, 5),
      clipped: reveals
        .filter((e) => {
          const cp = getComputedStyle(e).clipPath
          return cp && cp !== 'none' && /100%/.test(cp)
        })
        .map((e) => e.className)
        .slice(0, 5),
      jsPan: document.querySelectorAll('.work__track.is-pan').length,
      trackX: getComputedStyle(document.querySelector('.work__track')).overflowX,
      caseScale: [...document.querySelectorAll('.case')]
        .map((c) => +new DOMMatrixReadOnly(getComputedStyle(c).transform).a.toFixed(3))
        .filter((s) => Math.abs(s - 1) > 0.002).length,
      deckPx: getComputedStyle(document.querySelector('.hero__world')).getPropertyValue('--px').trim() || '0',
    }
  })
  const ov = await page.evaluate(findOverflow)
  await ctx.close()

  const anim = chunks.filter((u) => /\/gsap-|\/lenis-/.test(u))
  if (m.hidden.length) probs.push(`${m.hidden.length}/${m.reveals} 个入场元素停在 opacity<0.9：${m.hidden.join(' | ')}`)
  if (m.clipped.length) probs.push(`${m.clipped.length} 个元素还被 clip-path 剪着：${m.clipped.join(' | ')}`)
  if (anim.length) probs.push(`降级下仍拉了动效包：${[...new Set(anim.map((u) => u.split('/').pop()))].join(' | ')}`)
  if (m.jsPan) probs.push('降级下横推仍被 JS 接管（.is-pan 还在）')
  if (!/auto|scroll/.test(m.trackX)) probs.push(`降级后未退回原生横滑：overflow-x=${m.trackX}`)
  if (m.caseScale) probs.push(`${m.caseScale} 张案例卡带着非 1 的 scale（堆叠动效没停）`)
  if (parseFloat(m.deckPx) !== 0) probs.push(`降级下开场视差仍在写 --px=${m.deckPx}`)
  if (ov.length) probs.push(`横向溢出 ${ov.length} 处：${ov.slice(0, 2).join(' | ')}`)
  if (errs.length) probs.push(`运行时错误：${errs.slice(0, 3).join(' | ')}`)

  probs.length
    ? fail('6', 'prefers-reduced-motion 降级', probs.join('; '))
    : pass(
        '6',
        'prefers-reduced-motion 降级',
        `0 个 gsap/lenis 请求、${m.reveals} 个入场元素全部落终态、横推退回 overflow-x:${m.trackX}、案例卡 scale 全为 1、开场视差 --px=0、0 溢出 0 错误`,
      )
}

/* === 7. 章节密度与色调 ================================================
   一章的内容包围盒占不到视口 35%，那就是「空得没有重点」。 */
if (want(7)) {
  const probs = []
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await scrollThrough(page)

  const prints = []
  for (const c of CHAPTERS) {
    await goto(page, c.id)
    prints.push(
      await page.evaluate((id) => {
        const sec = document.getElementById(id)
        const vw = window.innerWidth
        const vh = window.innerHeight
        const nodes = [...sec.querySelectorAll('*')].filter(
          (el) =>
            [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) ||
            el.tagName === 'IMG' ||
            el.tagName === 'SVG',
        )
        const rects = nodes
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < vh)
        const left = rects.length ? Math.min(...rects.map((r) => Math.max(0, r.left))) : 0
        const right = rects.length ? Math.max(...rects.map((r) => Math.min(vw, r.right))) : 0
        const top = rects.length ? Math.min(...rects.map((r) => Math.max(0, r.top))) : 0
        const bot = rects.length ? Math.max(...rects.map((r) => Math.min(vh, r.bottom))) : 0
        const hull = rects.length ? ((right - left) * (bot - top)) / (vw * vh) : 0
        return { id, tone: sec.dataset.tone || '-', hull: +hull.toFixed(3), n: rects.length }
      }, c.id),
    )
  }
  await ctx.close()

  for (const p of prints) {
    const w = CHAPTERS.find((c) => c.id === p.id)
    if (w && p.tone !== w.tone) probs.push(`#${p.id} 色调 ${p.tone}，期望 ${w.tone}`)
    if (p.hull < 0.35) probs.push(`#${p.id} 内容只占视口 ${(p.hull * 100).toFixed(0)}%（< 35%，太空）`)
  }
  const sheet = prints.map((p) => `${p.id}(${p.tone}) 占屏${(p.hull * 100).toFixed(0)}% ${p.n}个元素`).join(' · ')
  probs.length ? fail('7', '章节密度与色调', [...probs, `实测：${sheet}`].join('\n      ')) : pass('7', '章节密度与色调', sheet)
}

/* === 8. 外链可达性 =================================================== */
if (want(8) && !SKIP_LINKS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await scrollThrough(page)
  const all = await page.evaluate(() =>
    Array.from(new Set(Array.from(document.querySelectorAll('a[href^="http"]')).map((a) => a.href))),
  )
  await ctx.close()
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
  // 反爬墙不是死链。B 站空间页对机房 IP 一律回 412，换成真浏览器导航同样 412。
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
} else if (want(8)) {
  pass('8', '外链可达', 'skipped')
}

/* === 11. CSS 3D 与指针视差 ===========================================
   v7 把 3D 从「常驻 WebGL 织带」收敛成「分层视差 + 卡片 CSS 3D」。
   这一关守三件事：产物里不许再有 three；桌面端指针真的驱动三层位移；
   减弱动效下位移必须归零（第 6 关已经查过 --px，这里查三层是否真的错开）。 */
if (want(11)) {
  const probs = []
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const urls = []
  page.on('response', (r) => urls.push(r.url()))
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await page.mouse.move(1200, 260)
  await page.waitForTimeout(120)
  await page.mouse.move(1240, 300)
  await page.waitForTimeout(500)
  const m = await page.evaluate(() => {
    const deck = document.querySelector('.hero__world')
    const cs = getComputedStyle(deck)
    const panes = [...document.querySelectorAll('#hero .slab')].map((p) => {
      const mx = new DOMMatrixReadOnly(getComputedStyle(p).transform)
      return { x: +mx.m41.toFixed(2), y: +mx.m42.toFixed(2), rot: +Math.round(Math.atan2(mx.b, mx.a) * 5730) / 100 }
    })
    const tiltCss = [...document.styleSheets]
      .flatMap((s) => {
        try {
          return [...s.cssRules]
        } catch {
          return []
        }
      })
      .some((r) => r.selectorText && /\.tilt/.test(r.selectorText) && /perspective/.test(r.style.transform || ''))
    return {
      px: cs.getPropertyValue('--px').trim(),
      py: cs.getPropertyValue('--py').trim(),
      panes,
      tilt: document.querySelectorAll('.tilt').length,
      tiltCss,
    }
  })
  await ctx.close()

  if (urls.some((u) => /\/three-|three\.module/.test(u))) probs.push('产物里仍在请求 three')
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'))
  if (pkg.dependencies?.three || pkg.devDependencies?.['@types/three']) probs.push('package.json 里还留着 three 依赖')
  if (!parseFloat(m.px) && !parseFloat(m.py)) probs.push(`指针没有驱动视差（--px=${m.px} --py=${m.py}）`)
  if (m.panes.length < 4) probs.push(`开场色块 ${m.panes.length} 块，期望至少 4 块`)
  else {
    const xs = new Set(m.panes.map((p) => p.x))
    const rots = new Set(m.panes.map((p) => p.rot))
    if (xs.size < 3) probs.push(`色块位移没错开：x=${m.panes.map((p) => p.x).join(' / ')}`)
    if (rots.size < 3) probs.push(`色块角度没错开：rot=${m.panes.map((p) => p.rot).join(' / ')}`)
  }
  if (!m.tilt) probs.push('没有任何 .tilt 卡片')
  if (!m.tiltCss) probs.push('.tilt 规则里没有 perspective()，卡片不是真 3D')

  probs.length
    ? fail('11', 'CSS 3D 与指针视差', probs.join('; '))
    : pass(
        '11',
        'CSS 3D 与指针视差',
        `0 个 three 请求、package.json 已清依赖；指针 --px=${m.px} --py=${m.py} 驱动三层错位（x ${m.panes
          .map((p) => p.x)
          .join(' / ')}，rot ${m.panes.map((p) => p.rot).join(' / ')}°）；${m.tilt} 张 .tilt 卡带 perspective`,
      )
}

/* === 12. 作品横推与案例堆叠 ========================================== */
if (want(12)) {
  const probs = []
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1800)
  // 跑道要先进视口，useLazyScene 才会装场景、才量得到真实高度
  await goto(page, 'work', -200)
  await page.waitForTimeout(1200)

  const railTop = await page.evaluate(() => {
    const el = document.querySelector('.work__rail')
    return el ? el.getBoundingClientRect().top + window.scrollY : -1
  })
  const samples = []
  for (const f of [0.05, 0.55, 1]) {
    await page.evaluate(
      ([top, frac]) => {
        const el = document.querySelector('.work__rail')
        const h = el ? el.offsetHeight - window.innerHeight : 0
        window.scrollTo({ top: top + h * frac, behavior: 'instant' })
      },
      [railTop, f],
    )
    await page.waitForTimeout(f === 1 ? 2400 : 800)
    samples.push(
      await page.evaluate(() => +new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.work__track')).transform).m41.toFixed(1)),
    )
  }
  const tail = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.pcard')]
    const last = cards[cards.length - 1]
    const track = document.querySelector('.work__track')
    const r = last.getBoundingClientRect()
    return {
      name: last?.querySelector('.pcard__name')?.textContent?.trim().slice(0, 16) || '?',
      gap: +(window.innerWidth - r.right).toFixed(1),
      gutter: +(parseFloat(getComputedStyle(track).paddingInlineEnd) || 0).toFixed(1),
      n: cards.length,
    }
  })
  const jsPan = await page.evaluate(() => document.querySelectorAll('.work__track.is-pan').length)

  // 案例堆叠：第二张压上来时，第一张必须已经缩小并沉降
  await page.evaluate(() => {
    const cards = document.querySelectorAll('.case')
    if (cards.length > 1) window.scrollTo({ top: cards[1].getBoundingClientRect().top + window.scrollY - 40, behavior: 'instant' })
  })
  await page.waitForTimeout(1000)
  const stack = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.case')]
    if (!cards.length) return null
    const mx = new DOMMatrixReadOnly(getComputedStyle(cards[0]).transform)
    return {
      n: cards.length,
      scale: +mx.a.toFixed(3),
      sink: +(getComputedStyle(cards[0]).getPropertyValue('--sink').trim() || 0),
      sticky: getComputedStyle(cards[0]).position,
      lastSink: +(getComputedStyle(cards[cards.length - 1]).getPropertyValue('--sink').trim() || 0),
    }
  })
  await ctx.close()

  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page2 = await ctx2.newPage()
  await page2.goto(URL_BASE, { waitUntil: 'load' })
  await page2.waitForTimeout(1500)
  await scrollThrough(page2)
  /* v8 的窄屏契约是「横推退回原生横滑」。v9 把这条契约整个换掉了：跑道在
     窄屏根本不渲染成跑道，六张卡竖排堆叠。原因见 v9 计划 §3.2 —— 断点打架
     时 GSAP 会把 rail 钉成 2600px 高的死区，横滑同时被 overflow-y 吞掉。
     所以这里改成验「真的竖排了」：单列网格、无残留 transform、不横向溢出、
     六张卡自上而下依次排开。 */
  const narrow = await page2.evaluate(() => {
    const track = document.querySelector('.work__track')
    const cs = getComputedStyle(track)
    const cards = [...document.querySelectorAll('.pcard')]
    // 满宽的基准是跑道的内容盒（要减掉左右 gutter），不是视口
    const vpW =
      track.clientWidth - (parseFloat(cs.paddingInlineStart) || 0) - (parseFloat(cs.paddingInlineEnd) || 0)
    return {
      display: cs.display,
      cols: cs.gridTemplateColumns.split(' ').filter(Boolean).length,
      transform: cs.transform,
      xOver: track.scrollWidth - track.clientWidth,
      tops: cards.map((c) => Math.round(c.getBoundingClientRect().top + window.scrollY)),
      narrowCards: cards.filter((c) => vpW - c.getBoundingClientRect().width > 24).length,
      n: cards.length,
      cardPos: getComputedStyle(document.querySelector('.case')).position,
    }
  })
  await ctx2.close()

  if (!jsPan) probs.push('桌面端横推没被接管（.work__track 上没有 is-pan）')
  const moved = Math.abs(samples[2] - samples[0])
  if (moved < 200) probs.push(`横推行程只有 ${moved}px（样本 ${samples.join(' → ')}）`)
  if (!(samples[0] > samples[1] && samples[1] > samples[2])) probs.push(`横推方向不单调：${samples.join(' → ')}`)
  if (tail.n !== 6) probs.push(`作品卡 ${tail.n} 张，期望 6 张`)
  if (tail.gap < tail.gutter * 0.7)
    probs.push(`横推走完末卡「${tail.name}」右侧只剩 ${tail.gap}px，应约等于左侧 --gutter ${tail.gutter}px`)
  if (!stack) probs.push('找不到案例堆叠卡')
  else {
    if (stack.n !== 3) probs.push(`案例卡 ${stack.n} 张，期望 3 张`)
    if (stack.sticky !== 'sticky') probs.push(`案例卡不是 sticky（position=${stack.sticky}）`)
    if (!(stack.scale < 0.995)) probs.push(`第二张压上来时第一张没缩小（scale=${stack.scale}）`)
    if (!(stack.sink > 0.05)) probs.push(`第二张压上来时第一张没沉降（--sink=${stack.sink}）`)
    if (stack.lastSink > 0.01) probs.push(`最后一张不该沉降，实得 --sink=${stack.lastSink}`)
  }
  if (narrow.display !== 'grid' || narrow.cols !== 1)
    probs.push(`窄屏跑道没退成单列网格（display=${narrow.display} 列数=${narrow.cols}）`)
  if (narrow.transform !== 'none') probs.push(`窄屏跑道残留 transform=${narrow.transform}`)
  if (narrow.xOver > 2) probs.push(`窄屏跑道仍横向溢出 ${narrow.xOver}px`)
  if (narrow.narrowCards) probs.push(`窄屏 ${narrow.narrowCards} 张卡没铺满视口宽`)
  if (!narrow.tops.every((t, i) => i === 0 || t > narrow.tops[i - 1] + 40))
    probs.push(`窄屏六张卡没有自上而下依次排开：${narrow.tops.join(' / ')}`)
  if (narrow.cardPos !== 'static') probs.push(`窄屏案例卡未静态化（position=${narrow.cardPos}）`)

  probs.length
    ? fail('12', '作品横推与案例堆叠', probs.join('; '))
    : pass(
        '12',
        '作品横推与案例堆叠',
        `横推 ${samples.join(' → ')}（行程 ${moved}px，单调左移；${tail.n} 张卡，末卡「${tail.name}」右留白 ${tail.gap}px vs 左 --gutter ${tail.gutter}px）· 案例 ${stack.n} 张 sticky 卡，第二张压上时首张 scale=${stack.scale} --sink=${stack.sink}，末张 --sink=${stack.lastSink} · 窄屏跑道退成单列竖排（${narrow.n} 张卡满宽、0 横向溢出、transform:none），案例卡 position:static`,
      )
}

/* === 13. 视觉证据 ====================================================
   v6 最大的单点失败是「纯文字页面」。这一关把「有没有东西可看」量化：
   每章至少一个非文本视觉元素占到视口 6%，开场首屏合计 18%。 */
if (want(13)) {
  const probs = []
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await scrollThrough(page)

  const measure = (id) =>
    page.evaluate((i) => {
      const sec = document.getElementById(i)
      const vw = window.innerWidth
      const vh = window.innerHeight
      const ground = getComputedStyle(sec).backgroundColor
      const solid = (c) => c && c !== 'transparent' && !/rgba\(0, 0, 0, 0\)/.test(c)
      const blocks = [...sec.querySelectorAll('*')].filter((el) => {
        const cs = getComputedStyle(el)
        if (!solid(cs.backgroundColor) || cs.backgroundColor === ground) return false
        const r = el.getBoundingClientRect()
        if (r.width * r.height < window.innerWidth * window.innerHeight * 0.01) return false
        // 剔除嵌套：父级已经是同色独立块就不重复计
        const p = el.parentElement
        if (p && p !== sec && getComputedStyle(p).backgroundColor === cs.backgroundColor) return false
        return true
      })
      const vis = [...new Set([...sec.querySelectorAll('svg, canvas, video, img'), ...blocks])]
      let best = 0
      let total = 0
      for (const el of vis) {
        const r = el.getBoundingClientRect()
        const w = Math.max(0, Math.min(vw, r.right) - Math.max(0, r.left))
        const h = Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top))
        const a = (w * h) / (vw * vh)
        if (a <= 0) continue
        total += a
        if (a > best) best = a
      }
      return { best: +best.toFixed(3), total: +total.toFixed(3), n: vis.length }
    }, id)

  const rows = []
  for (const c of CHAPTERS) {
    // 断言是「这一章有没有东西可看」，不是「章顶第一屏」——所以要在整章行程里取最大值
    const span = await page.evaluate((i) => {
      const s = document.getElementById(i)
      return { h: s.getBoundingClientRect().height, vh: window.innerHeight }
    }, c.id)
    const stops = []
    for (let off = 0; off <= Math.max(0, span.h - span.vh); off += Math.round(span.vh * 0.6)) stops.push(off)
    if (!stops.length) stops.push(0)
    let best = 0
    let total = 0
    let head = null
    let n = 0
    for (const off of stops) {
      await goto(page, c.id, off)
      const m = await measure(c.id)
      if (off === 0) head = m
      best = Math.max(best, m.best)
      total = Math.max(total, m.total)
      n = m.n
    }
    rows.push({ id: c.id, best, total, head, n })
  }
  const site = await page.evaluate(() => ({
    vec: document.querySelectorAll('svg').length,
    bitmap: document.querySelectorAll('img, picture').length,
    workCards: document.querySelectorAll('.pcard').length,
  }))
  await ctx.close()

  for (const r of rows) {
    if (r.id === 'contact') continue
    if (r.best < 0.06 && r.total < 0.25)
      probs.push(`#${r.id} 最大视觉元素只占视口 ${(r.best * 100).toFixed(1)}%（< 6%）且合计仅 ${(r.total * 100).toFixed(1)}%（< 25%）`)
  }
  const heroRow = rows.find((r) => r.id === 'hero')
  if (heroRow.head.total < 0.18) probs.push(`开场首屏视觉元素合计 ${(heroRow.head.total * 100).toFixed(1)}%（< 18%）`)
  if (site.vec < 12) probs.push(`全站矢量图形只有 ${site.vec} 个（< 12）`)
  if (site.bitmap) probs.push(`还残留 ${site.bitmap} 处位图元素`)

  const sheet = rows.map((r) => `${r.id} 最大${(r.best * 100).toFixed(0)}%/合计${(r.total * 100).toFixed(0)}%`).join(' · ')
  probs.length
    ? fail('13', '视觉证据', [...probs, `实测：${sheet}`].join('\n      '))
    : pass('13', '视觉证据', `${sheet} · 全站 ${site.vec} 个矢量图形、${site.bitmap} 张位图 · ${site.workCards} 张作品卡`)
}

/* === 14. 遮挡 ========================================================
   v6 的手写批注是不透明胶囊浮在正文上，吃掉了整整一行字。这一关不看设计意图，
   只看命中测试：每个可见文本元素取中心 + 四个内角，elementFromPoint 必须
   落在它自己或它的后代上。装饰层另外单独查与正文的矩形交叠。 */
if (want(14)) {
  const probs = []
  const details = []
  for (const vp of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const ctx = await browser.newContext({ viewport: vp, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await page.goto(URL_BASE, { waitUntil: 'load' })
    await page.waitForTimeout(1500)
    await scrollThrough(page)
    // 自测：--self-test 会往正文上贴一个不透明胶囊（复刻 v6 的那个 bug）。
    // 这一关必须因此变红，否则说明它已经测不出东西了。
    if (SELF_TEST)
      await page.evaluate(() => {
        const t = document.querySelector('#craft .ch-lede')
        const r = t.getBoundingClientRect()
        const d = document.createElement('div')
        d.style.cssText = `position:absolute;left:${r.left + window.scrollX + 20}px;top:${r.top + window.scrollY + 4}px;width:${r.width * 0.6}px;height:${r.height * 0.5}px;background:#2F6B63;border-radius:999px;z-index:99`
        d.className = 'self-test-capsule'
        document.body.appendChild(d)
      })
    let checked = 0
    for (const c of CHAPTERS) {
      await goto(page, c.id)
      const hit = await page.evaluate((id) => {
        const sec = document.getElementById(id)
        const vw = window.innerWidth
        const vh = window.innerHeight
        const out = { checked: 0, bad: [], annot: [] }
        const texts = [...sec.querySelectorAll('*')].filter((el) => {
          if (el.closest('[aria-hidden="true"]')) return false
          if (!/\S/.test([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''))) return false
          const cs = getComputedStyle(el)
          if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.5) return false
          // 沉降中的案例卡是故意被盖住的，跳过
          let n = el
          while (n && n !== document.body) {
            if (parseFloat(getComputedStyle(n).getPropertyValue('--sink') || '0') > 0.05) return false
            n = n.parentElement
          }
          return true
        })
        /* 「盖住」= 在这一点上真的画了东西压在上面。
           中文字体的字形盒（ascent+descent）比收紧后的行高高一截，相邻行的
           font box 天然互相穿插 —— 那是负行距的正常排版，不是遮挡。所以这里
           不看盒子叠不叠，只看压在上面的那层在这一点上到底有没有落墨。 */
        const paintsAt = (t, x, y) => {
          if (['IMG', 'SVG', 'CANVAS', 'VIDEO', 'PICTURE', 'INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return true
          const cs = getComputedStyle(t)
          if (cs.backgroundImage !== 'none') return true
          const m = (cs.backgroundColor.match(/[\d.]+/g) || []).map(Number)
          if (m.length && (m.length < 4 || m[3] > 0.05)) return true
          if (['top', 'right', 'bottom', 'left'].some((s) => parseFloat(cs[`border${s[0].toUpperCase()}${s.slice(1)}Width`]) > 0)) {
            const r = t.getBoundingClientRect()
            const w = Math.max(...['Top', 'Right', 'Bottom', 'Left'].map((s) => parseFloat(cs[`border${s}Width`]) || 0))
            const onEdge = x - r.left <= w || r.right - x <= w || y - r.top <= w || r.bottom - y <= w
            if (onEdge) return true
          }
          // 纯文字层：只有字形墨迹能挡住东西。墨迹带按字号取，不按 font box。
          const fs = parseFloat(cs.fontSize) || 0
          for (const n of t.childNodes) {
            if (n.nodeType !== 3 || !/\S/.test(n.textContent)) continue
            const rg = document.createRange()
            rg.selectNodeContents(n)
            for (const rr of rg.getClientRects()) {
              if (x < rr.left || x > rr.right) continue
              const c = (rr.top + rr.bottom) / 2
              const half = Math.min(rr.height, fs * 0.92) / 2
              if (y >= c - half && y <= c + half) return true
            }
          }
          return false
        }
        // pointer-events:none 的实心浮层不会出现在命中链里，单独扫一遍
        const ghosts = [...sec.querySelectorAll('*')].filter((n) => {
          const cs = getComputedStyle(n)
          if (cs.pointerEvents !== 'none') return false
          if (!['absolute', 'fixed', 'sticky'].includes(cs.position)) return false
          const m = (cs.backgroundColor.match(/[\d.]+/g) || []).map(Number)
          return cs.backgroundImage !== 'none' || (m.length && (m.length < 4 || m[3] > 0.05))
        })

        for (const el of texts) {
          const r = el.getBoundingClientRect()
          if (r.width < 8 || r.height < 8) continue
          if (r.top < 4 || r.bottom > vh - 4 || r.left < 2 || r.right > vw - 2) continue
          /* 采样点要落在这个元素自己真的画得到的地方：
             竖向收进字形墨迹带（否则采到的是中文字体空荡的 ascent 区），
             横向按圆角收进（药丸的矩形角落本来就是透明的）。 */
          const cs0 = getComputedStyle(el)
          const fs0 = parseFloat(cs0.fontSize) || 0
          const inkH = Math.min(r.height, fs0 * 0.92)
          const cy = (r.top + r.bottom) / 2
          const inkTop = cy - inkH / 2 + 2
          const inkBot = cy + inkH / 2 - 2
          const rad = Math.max(
            0,
            ...(cs0.borderRadius.match(/[\d.]+px/g) || ['0px']).map((v) => parseFloat(v)),
          )
          const ix = Math.max(3, Math.min(rad, r.width / 2) * 0.72)
          const iy = Math.max(3, Math.min(rad, r.height / 2) * 0.72)
          const ty = Math.min(Math.max(r.top + iy, inkTop), inkBot)
          const by = Math.max(Math.min(r.bottom - iy, inkBot), inkTop)
          const pts = [
            [(r.left + r.right) / 2, cy],
            [r.left + ix, ty],
            [r.right - ix, ty],
            [r.left + ix, by],
            [r.right - ix, by],
          ]
          let flagged = null
          for (const [x, y] of pts) {
            out.checked++
            const stack = document.elementsFromPoint(x, y)
            const i = stack.indexOf(el)
            const above = i < 0 ? stack : stack.slice(0, i)
            for (const t of above) {
              if (t === el || el.contains(t) || t.contains(el)) continue
              if (!paintsAt(t, x, y)) continue
              flagged = t
              break
            }
            if (!flagged)
              for (const g of ghosts) {
                if (g.contains(el) || el.contains(g)) continue
                const gr = g.getBoundingClientRect()
                if (x >= gr.left && x <= gr.right && y >= gr.top && y <= gr.bottom) {
                  flagged = g
                  break
                }
              }
            if (flagged) break
          }
          if (flagged)
            out.bad.push(
              `${el.className || el.tagName}"${(el.textContent || '').trim().slice(0, 14)}" 被 ${flagged.className || flagged.tagName} 盖住`,
            )
        }
        // 装饰层与正文块的矩形交叠
        const blocks = texts.filter((e) => !e.closest('[data-annot]'))
        for (const a of sec.querySelectorAll('[data-annot]')) {
          const ar = a.getBoundingClientRect()
          if (ar.width < 2 || ar.height < 2) continue
          for (const b of blocks) {
            if (a.contains(b) || b.contains(a)) continue
            const br = b.getBoundingClientRect()
            const w = Math.min(ar.right, br.right) - Math.max(ar.left, br.left)
            const h = Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top)
            if (w > 1 && h > 1)
              out.annot.push(
                `${a.className || a.tagName} 与 ${b.className || b.tagName}"${(b.textContent || '').trim().slice(0, 12)}" 交叠 ${Math.round(w)}×${Math.round(h)}`,
              )
          }
        }
        return out
      }, c.id)
      checked += hit.checked
      for (const b of hit.bad.slice(0, 3)) probs.push(`${vp.name}/#${c.id} ${b}`)
      for (const a of [...new Set(hit.annot)].slice(0, 3)) probs.push(`${vp.name}/#${c.id} 装饰压正文：${a}`)
    }
    details.push(`${vp.name} ${checked} 个命中点`)
    await ctx.close()
  }
  probs.length
    ? fail('14', '遮挡', probs.slice(0, 16).join('\n      '))
    : pass('14', '遮挡', `${details.join(' · ')}，0 处文字被盖、0 处装饰层压正文`)
}

/* === 15. 形状锁 ======================================================
   v6 的案例卡是直角，同章的指标小方块却有圆角。一套刻度，四个值，没有例外。 */
if (want(15)) {
  const probs = []
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await scrollThrough(page)
  const m = await page.evaluate(() => {
    // v9 放开 --r-pill(999) 给按钮 / 标签 / 状态灯；其余四档不变。
    const ALLOWED = [0, 6, 11, 14, 24, 999]
    const off = []
    const cards = []
    const square = []
    for (const el of document.querySelectorAll('#root *')) {
      const r = el.getBoundingClientRect()
      if (r.width * r.height < 1500) continue
      const cs = getComputedStyle(el)
      const hasBg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && !/^rgba\(.*,\s*0\)$/.test(cs.backgroundColor)
      const hasBorder = parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0
      const hasShadow = cs.boxShadow !== 'none'
      if (!hasBg && !hasBorder && !hasShadow) continue
      const radii = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomLeftRadius, cs.borderBottomRightRadius]
        .map((v) => parseFloat(v) || 0)
      const pill = radii.every((v) => v >= Math.min(r.width, r.height) / 2 - 1)
      if (pill) continue
      for (const v of radii) {
        if (!ALLOWED.some((a) => Math.abs(a - v) < 0.6)) {
          off.push(`${el.className || el.tagName} r=${radii.join('/')} (${Math.round(r.width)}×${Math.round(r.height)})`)
          break
        }
      }
      if (el.hasAttribute('data-card')) cards.push(`${String(el.className).split(' ')[0]}:${radii[0]}`)
      // 反向规则：卡内大面积独立背景块不允许是直角
      if (el.closest('[data-card]') && !el.hasAttribute('data-card') && hasBg && r.width * r.height > 8000) {
        const ownBg = cs.backgroundColor
        const pBg = el.parentElement ? getComputedStyle(el.parentElement).backgroundColor : ''
        if (ownBg !== pBg && radii.every((v) => v < 0.6)) {
          square.push(`${String(el.className).split(' ')[0] || el.tagName} ${Math.round(r.width)}×${Math.round(r.height)}`)
        }
      }
    }
    return { off: [...new Set(off)], cards: [...new Set(cards)], square: [...new Set(square)] }
  })
  await ctx.close()
  if (m.off.length) probs.push(`圆角越界 ${m.off.length} 处：${m.off.slice(0, 6).join(' | ')}`)
  const cardRadii = new Set(m.cards.map((c) => c.split(':')[1]))
  if (cardRadii.size > 1) probs.push(`[data-card] 圆角不统一：${m.cards.join(' | ')}`)
  if (![...cardRadii][0] || Math.abs(parseFloat([...cardRadii][0]) - 24) > 0.6)
    probs.push(`[data-card] 圆角应为 24px，实得 ${[...cardRadii].join('/')}`)
  if (m.square.length)
    probs.push(`卡内 ${m.square.length} 处大面积色块是直角：${m.square.slice(0, 6).join(' | ')}`)
  probs.length
    ? fail('15', '形状锁', probs.join('\n      '))
    : pass('15', '形状锁', `面积 >1500px² 的有背景元素圆角全部 ∈ {0, 6, 11, 14, 24, 999, pill}；${m.cards.length} 类 [data-card] 统一 24px；卡内 0 处大面积直角块`)
}

/* === 20. 零位图 ======================================================
   v8 的硬边界：页面上不许出现任何位图。<img> / <picture> / background-image:url()
   命中即违规；SVG 与 data-uri 矢量放行，渐变不算图。 */
if (want(20)) {
  const probs = []
  for (const route of ROUTES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await page.goto(URL_BASE + route, { waitUntil: 'load' })
    await page.waitForTimeout(900)
    await scrollThrough(page)
    const hit = await page.evaluate(() => {
      const out = []
      for (const el of document.querySelectorAll('#root img, #root picture')) out.push(el.tagName.toLowerCase())
      for (const el of document.querySelectorAll('#root *')) {
        const bi = getComputedStyle(el).backgroundImage
        if (!bi || bi === 'none') continue
        for (const u of bi.match(/url\((['"]?)([^'")]+)\1\)/g) || []) {
          const src = u.slice(4, -1).replace(/['"]/g, '')
          if (/^data:image\/svg/i.test(src) || /\.svg(\?|$)/i.test(src)) continue
          out.push(`${String(el.className).split(' ')[0] || el.tagName} background-image:${src.slice(0, 60)}`)
        }
      }
      return [...new Set(out)]
    })
    await ctx.close()
    if (hit.length) probs.push(`/${route || ''} 命中 ${hit.length} 处位图：${hit.slice(0, 5).join(' | ')}`)
  }
  probs.length
    ? fail('20', '零位图', probs.join('\n      '))
    : pass('20', '零位图', `${ROUTES.length} 条路由 0 个 <img>/<picture>、0 处 background-image: url() 位图；渐变与 SVG 放行`)
}

/* === 16. 章间差异度 ==================================================
   「每章一个模子」是 v6 最难自查的毛病。把每章压成八维特征向量，
   归一化后两两欧氏距离必须 ≥ 0.45。距离小 = 两章长得一样。 */
if (want(16)) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await scrollThrough(page)
  const vecs = []
  for (const c of CHAPTERS) {
    await goto(page, c.id)
    vecs.push(
      await page.evaluate((id) => {
        const sec = document.getElementById(id)
        const vw = window.innerWidth
        const vh = window.innerHeight
        const clip = (r) => {
          const w = Math.max(0, Math.min(vw, r.right) - Math.max(0, r.left))
          const h = Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top))
          return w * h
        }
        let cols = 1
        for (const el of sec.querySelectorAll('*')) {
          const cs = getComputedStyle(el)
          if (cs.display !== 'grid') continue
          const n = cs.gridTemplateColumns.split(' ').filter(Boolean).length
          if (n > cols) cols = n
        }
        let img = 0
        for (const el of sec.querySelectorAll('img, svg')) img += clip(el.getBoundingClientRect())
        let txt = 0
        let maxFont = 0
        let left = vw
        for (const el of sec.querySelectorAll('*')) {
          if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
          const r = el.getBoundingClientRect()
          if (r.bottom < 0 || r.top > vh) continue
          txt += clip(r)
          const f = parseFloat(getComputedStyle(el).fontSize)
          if (f > maxFont) maxFont = f
          if (r.left >= 0 && r.left < left) left = r.left
        }
        const cs = getComputedStyle(sec)
        const bg = cs.backgroundColor
        const horiz = [...sec.querySelectorAll('*')].some(
          (e) => e.scrollWidth - e.clientWidth > 40 && ['auto', 'scroll'].includes(getComputedStyle(e).overflowX),
        ) || sec.querySelectorAll('.is-pan').length > 0
        return {
          id,
          cols,
          img: +(img / (vw * vh)).toFixed(3),
          txt: +(txt / (vw * vh)).toFixed(3),
          maxFont: +(maxFont / vw).toFixed(4),
          align: +(left / vw).toFixed(3),
          bg,
          cards: sec.querySelectorAll('[data-card]').length,
          horiz: horiz ? 1 : 0,
        }
      }, c.id),
    )
  }
  await ctx.close()

  const parse = (s) => (s.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number)
  const feat = vecs.map((v) => {
    const [r, g, b] = parse(v.bg)
    return [
      Math.min(1, v.cols / 12),
      Math.min(1, v.img * 2),
      Math.min(1, v.txt),
      Math.min(1, v.maxFont * 12),
      Math.min(1, v.align * 3),
      lum({ r, g, b }),
      Math.min(1, v.cards / 6),
      v.horiz,
    ]
  })
  const probs = []
  const dists = []
  for (let i = 0; i < feat.length; i++) {
    for (let j = i + 1; j < feat.length; j++) {
      const d = Math.sqrt(feat[i].reduce((s, x, k) => s + (x - feat[j][k]) ** 2, 0))
      dists.push({ a: vecs[i].id, b: vecs[j].id, d: +d.toFixed(3) })
      if (d < 0.45) probs.push(`#${vecs[i].id} 与 #${vecs[j].id} 构图距离只有 ${d.toFixed(3)}（< 0.45）`)
    }
  }
  const near = [...dists].sort((x, y) => x.d - y.d).slice(0, 3)
  const sheet = vecs
    .map((v) => `${v.id} ${v.cols}列 图${(v.img * 100).toFixed(0)}% 字${(v.txt * 100).toFixed(0)}% 卡${v.cards}${v.horiz ? ' 横滚' : ''}`)
    .join(' · ')
  probs.length
    ? fail('16', '章间差异度', [...probs, `实测：${sheet}`].join('\n      '))
    : pass('16', '章间差异度', `${sheet}\n      最接近的三对：${near.map((n) => `${n.a}/${n.b} ${n.d}`).join('、')}（下限 0.45）`)
}

/* === 17. 配色纪律 ====================================================
   用户点名杜绝深色模式与深黑。这一关锁死：只声明浅色方案、没有任何
   prefers-color-scheme: dark、没有 #000、章节底色 3-5 种、强调色全出自 palette A。 */
if (want(17)) {
  const probs = []
  const cssFiles = ['src/styles/index.css', 'src/styles/palettes.css']
  let cssAll = ''
  for (const f of cssFiles) cssAll += await readFile(path.join(ROOT, f), 'utf8')
  const cssNoComment = cssAll.replace(/\/\*[\s\S]*?\*\//g, '')
  const html = await readFile(path.join(ROOT, 'index.html'), 'utf8')
  if (/prefers-color-scheme\s*:\s*dark/.test(cssNoComment)) probs.push('CSS 里有 prefers-color-scheme: dark')
  if (!/color-scheme\s*:\s*light/.test(cssNoComment)) probs.push('没有声明 color-scheme: light')
  if (!/name="color-scheme"\s+content="light"/.test(html)) probs.push('index.html 缺 <meta name="color-scheme" content="light">')
  const blacks = [...cssNoComment.matchAll(/#0{3,8}\b/g)].map((m) => m[0])
  if (blacks.length) probs.push(`${blacks.length} 处纯黑 ${[...new Set(blacks)].join(' ')}`)

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', colorScheme: 'dark' })
  const page = await ctx.newPage()
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1200)
  const m = await page.evaluate(() => {
    const grounds = {}
    const accents = new Set()
    for (const sec of document.querySelectorAll('#root section[id]')) {
      const cs = getComputedStyle(sec)
      grounds[sec.id] = cs.backgroundColor
      for (const v of ['--accent', '--tint', '--tint-deep', '--ground']) {
        const raw = cs.getPropertyValue(v).trim()
        if (raw) accents.add(raw)
      }
    }
    return { grounds, accents: [...accents], bodyBg: getComputedStyle(document.body).backgroundColor }
  })
  await ctx.close()

  const toHex = (s) => {
    const n = (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number)
    return n.length === 3 ? hex({ r: n[0], g: n[1], b: n[2] }) : null
  }
  const groundHexes = [...new Set(Object.values(m.grounds).map(toHex).filter(Boolean))]
  if (groundHexes.length < 3 || groundHexes.length > 5)
    probs.push(`章节底色 ${groundHexes.length} 种（${groundHexes.join(' ')}），应在 3-5 之间`)
  const bodyHex = toHex(m.bodyBg)
  if (bodyHex && lum({ r: parseInt(bodyHex.slice(1, 3), 16), g: parseInt(bodyHex.slice(3, 5), 16), b: parseInt(bodyHex.slice(5, 7), 16) }) < 0.5)
    probs.push(`系统深色下 body 背景反转成 ${bodyHex}`)
  const pal = await loadPalette(browser)
  const offPalette = m.accents
    .map((a) => (a.startsWith('#') ? a.toUpperCase() : toHex(a)))
    .filter((h) => h && !pal.set.has(h))
  if (offPalette.length) probs.push(`强调色不在当前色板内：${[...new Set(offPalette)].join(' ')}`)

  /* 浅色小字只能压在色板的暗档上。v8 这里写死了 palette A 的四个 -deep 值，
     换组就废；改成从色板里按相对亮度筛：L < 0.25 才算暗档。中间调（brand-tint、
     highlight、cream-dark）压白字必然不够，这条就是拦它们的。 */
  const rgbOf = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) })
  const DARK_TIER = new Set([...pal.set].filter((h) => lum(rgbOf(h)) < 0.25))
  const wrong = contrastReport
    .filter((c) => !c.large && lum(c.fg) > 0.5 && !DARK_TIER.has(c.bgHex))
    .map((c) => `${c.cls}"${c.text.slice(0, 10)}" 压 ${c.bgHex}`)
  if (wrong.length) probs.push(`${wrong.length} 处小号浅色字没压在暗档上：${[...new Set(wrong)].slice(0, 4).join(' | ')}`)

  probs.length
    ? fail('17', '配色纪律', probs.join('\n      '))
    : pass(
        '17',
        '配色纪律',
        `color-scheme:light 已声明、0 处 dark 媒体查询、0 处纯黑；系统深色下 body 仍是 ${bodyHex}；章节底色 ${groundHexes.length} 种 ${groundHexes.join(' ')}；强调色全部出自运行时色板（${pal.set.size} 色）`,
      )
}

/* === 18. AI 味扫描（DOM 层） =========================================
   19 关里唯一一关只看渲染结果不看源码：破折号、滚动提示、版本号 eyebrow、
   元信息行里堆点号、「阶段 1/2/3」、上下双描边长列表、自定义指针、文字发光。 */
if (want(18)) {
  const probs = []
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await scrollThrough(page)
  const m = await page.evaluate(() => {
    const out = {}
    const txt = document.querySelector('#root').innerText
    out.dash = (txt.match(/[\u2014\u2013]/g) || []).length
    out.dashCtx = (txt.match(/.{0,12}[\u2014\u2013].{0,12}/g) || []).slice(0, 4)
    out.scrollHint = (txt.match(/向下滚|往下滚|滚动查看|scroll\s*down|↓/gi) || []).slice(0, 4)
    out.version = [...document.querySelectorAll('.eyebrow')]
      .map((e) => (e.innerText || '').trim())
      .filter((t) => /\bv\s?\d+(\.\d+)?\b/i.test(t))
    out.stage = (txt.match(/阶段\s?[1-9１-９一二三四五]/g) || []).slice(0, 4)
    // 元信息行内点号 ≤ 1
    out.dots = []
    for (const el of document.querySelectorAll('#root *')) {
      const direct = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('')
      const n = (direct.match(/·/g) || []).length
      if (n > 1) out.dots.push(`${el.className || el.tagName}: ${direct.trim().slice(0, 40)}`)
    }
    /* 长列表每行上下双描边。真正的毛病是「上下紧挨的两行各画一条横线 → 中间变成 2px 双线」，
       所以只算竖直堆叠且贴边的相邻对；换行排布的胶囊（四边一圈描边）不是这个东西。 */
    out.striped = []
    for (const ul of document.querySelectorAll('ul, ol, dl')) {
      const kids = [...ul.children]
      if (kids.length <= 5) continue
      let pairs = 0
      for (let i = 0; i < kids.length - 1; i++) {
        const a = kids[i]
        const b = kids[i + 1]
        const ca = getComputedStyle(a)
        const cb = getComputedStyle(b)
        if (!(parseFloat(ca.borderBottomWidth) > 0 && parseFloat(cb.borderTopWidth) > 0)) continue
        const ra = a.getBoundingClientRect()
        const rb = b.getBoundingClientRect()
        if (Math.abs(rb.top - ra.bottom) < 2 && Math.abs(rb.left - ra.left) < 2) pairs++
      }
      if (pairs > 4) out.striped.push(`${ul.className || ul.tagName}: ${pairs} 对相邻双线/${kids.length}`)
    }
    // 自定义指针
    out.cursor = []
    for (const el of document.querySelectorAll('#root *')) {
      const c = getComputedStyle(el).cursor
      if (c === 'none' || /url\(/.test(c)) out.cursor.push(`${el.className || el.tagName}:${c.slice(0, 30)}`)
    }
    // 文字发光
    out.glow = []
    for (const el of document.querySelectorAll('#root *')) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
      const cs = getComputedStyle(el)
      if (cs.textShadow && cs.textShadow !== 'none') out.glow.push(`${el.className || el.tagName}:${cs.textShadow.slice(0, 34)}`)
      if (/drop-shadow/.test(cs.filter || '')) out.glow.push(`${el.className || el.tagName} filter:${cs.filter.slice(0, 30)}`)
    }
    out.cursor = [...new Set(out.cursor)]
    out.glow = [...new Set(out.glow)]
    out.dots = [...new Set(out.dots)]
    return out
  })
  await ctx.close()
  if (m.dash) probs.push(`渲染文本里有 ${m.dash} 处破折号：${m.dashCtx.join(' | ')}`)
  if (m.scrollHint.length) probs.push(`滚动提示：${m.scrollHint.join(' / ')}`)
  if (m.version.length) probs.push(`版本号 eyebrow：${m.version.join(' / ')}`)
  if (m.stage.length) probs.push(`「阶段 N」式步骤标签：${m.stage.join(' / ')}`)
  if (m.dots.length) probs.push(`元信息行内点号 >1：${m.dots.slice(0, 4).join(' | ')}`)
  if (m.striped.length) probs.push(`长列表每行上下双描边：${m.striped.join(' | ')}`)
  if (m.cursor.length) probs.push(`自定义指针：${m.cursor.slice(0, 3).join(' | ')}`)
  if (m.glow.length) probs.push(`文字发光/投影：${m.glow.slice(0, 3).join(' | ')}`)
  probs.length
    ? fail('18', 'AI 味扫描', probs.join('\n      '))
    : pass(
        '18',
        'AI 味扫描',
        '渲染文本 0 处破折号、0 滚动提示、0 版本号 eyebrow、0「阶段 N」标签、0 行堆点号、0 上下双描边长列表、0 自定义指针、0 文字发光',
      )
}

/* === 19. 首屏承载 ====================================================
   开场必须在一屏内讲完。标题按「刻意断行」判：每个 .hero__l 只能占一行，
   自动折行就说明字号或列宽没配好；总行数桌面 ≤ 3、手机 ≤ 4。 */
if (want(19)) {
  const probs = []
  const sheet = []
  for (const vp of [
    { name: 'desktop', width: 1440, height: 900, maxLines: 3 },
    { name: 'laptop', width: 1024, height: 768, maxLines: 3 },
    { name: 'mobile', width: 390, height: 844, maxLines: 4 },
    /* 390×844 是 iPhone，360×800 是大量安卓机的 CSS 尺寸。v8 只测前者，
       后者实测开场章 839px（比视口高 39px，底条被顶出首屏）却一路绿灯。 */
    { name: 'android', width: 360, height: 800, maxLines: 4 },
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: 'reduce',
    })
    const page = await ctx.newPage()
    await page.goto(URL_BASE, { waitUntil: 'load' })
    await page.waitForTimeout(1400)
    const m = await page.evaluate(() => {
      const sec = document.getElementById('hero')
      const h = document.querySelector('.hero__h')
      const lines = [...document.querySelectorAll('.hero__l')]
      const lh = parseFloat(getComputedStyle(h).lineHeight) || parseFloat(getComputedStyle(h).fontSize) * 1.1
      return {
        secH: Math.round(sec.scrollHeight),
        vh: window.innerHeight,
        spans: lines.length,
        wrapped: lines
          .map((l, i) => ({ i, rects: l.getClientRects().length, h: Math.round(l.getBoundingClientRect().height) }))
          .filter((l) => l.h > lh * 1.6),
        rendered: lines.reduce((s, l) => s + Math.max(1, Math.round(l.getBoundingClientRect().height / lh)), 0),
        sub: (document.querySelector('.hero__sub')?.textContent || '').trim().length,
        ctaWrapped: [...document.querySelectorAll('.hero__cta .btn')].filter((b) => b.getClientRects().length > 1).length,
        ctaN: document.querySelectorAll('.hero__cta .btn').length,
      }
    })
    await ctx.close()
    if (m.secH > m.vh + 2) probs.push(`${vp.name} 开场 ${m.secH}px > 视口 ${m.vh}px`)
    if (m.wrapped.length) probs.push(`${vp.name} ${m.wrapped.length} 个标题行自动折行（第 ${m.wrapped.map((w) => w.i + 1).join(',')} 行）`)
    if (m.rendered > vp.maxLines) probs.push(`${vp.name} 标题渲染 ${m.rendered} 行 > ${vp.maxLines}`)
    if (m.sub > 45) probs.push(`${vp.name} 副文案 ${m.sub} 字 > 45`)
    if (m.ctaWrapped) probs.push(`${vp.name} ${m.ctaWrapped}/${m.ctaN} 个 CTA 折行`)
    sheet.push(`${vp.name} ${m.secH}/${m.vh}px 标题${m.rendered}行 副${m.sub}字 CTA${m.ctaN}个不折行`)
  }
  probs.length ? fail('19', '首屏承载', [...probs, `实测：${sheet.join(' · ')}`].join('\n      ')) : pass('19', '首屏承载', sheet.join(' · '))
}

/* === 21. 移动端可用性（Chromium + WebKit 双引擎）=======================
   用户报的原话：「移动端作品通道空白占满一页而且无法滑动」。根因在 worksPan()
   里那句 rail.style.height = innerHeight + distance + 'px' —— 手写内联样式，
   gsap.context().revert() 清不掉。视口一旦宽过断点（手机横屏 932px 就够），
   跑道被钉成 2600px，转回竖屏后内容缩到 900px，剩下的全是空白。
   所以这一关除了静态量测，还要做一次「横屏→竖屏」往返，直接回归那个 bug。
   两个引擎都跑：无头 Chromium 的 dvh / sticky 行为和 iOS Safari 不一样。 */
if (want(21)) {
  const { MOBILE_PROBE } = await import('./gates-mobile.mjs')
  const probs = []
  const sheet = []
  for (const eng of [
    { name: 'chromium', launcher: chromium, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] },
    { name: 'webkit', launcher: webkit, args: [] },
  ]) {
    let b
    try {
      b = await eng.launcher.launch({ args: eng.args })
    } catch (e) {
      probs.push(`${eng.name} 起不来：${String(e).split('\n')[0]}`)
      continue
    }
    const ctx = await b.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: eng.name === 'chromium',
      hasTouch: true,
      reducedMotion: 'reduce',
    })
    const page = await ctx.newPage()
    await page.goto(URL_BASE, { waitUntil: 'load' })
    await page.waitForTimeout(1600)
    await scrollThrough(page)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(500)

    const check = async (phase) => {
      const m = await page.evaluate(MOBILE_PROBE)
      const tag = `${eng.name}/${phase}`
      if (m.scrollW > m.clientW + 1) probs.push(`${tag} 横向溢出 ${m.scrollW - m.clientW}px`)
      if (m.cards !== 6) probs.push(`${tag} 作品卡渲染 ${m.cards} 张，应为 6`)
      if (m.railInline !== '') probs.push(`${tag} .work__rail 残留内联高度 "${m.railInline}"`)
      if (m.railH != null && m.railContent != null && m.railH > m.railContent + 8)
        probs.push(`${tag} .work__rail 高 ${m.railH}px 超出内容 ${m.railContent}px`)
      if (m.trackTransform && m.trackTransform !== 'none')
        probs.push(`${tag} .work__track 残留 transform ${m.trackTransform}`)
      if (m.trackScrollW != null && m.trackScrollW > m.trackClientW + 4)
        probs.push(`${tag} .work__track 仍可横滚 ${m.trackScrollW}/${m.trackClientW}`)
      if (m.pinSpacers) probs.push(`${tag} 残留 ${m.pinSpacers} 个 .pin-spacer`)
      if (m.badAxis.length) probs.push(`${tag} ${m.badAxis.length} 个横滚容器没锁竖轴：${m.badAxis.slice(0, 3).join(' | ')}`)
      const deadZone = m.gaps.filter((g) => g.gap > m.vh * 0.6)
      if (deadZone.length) probs.push(`${tag} 空白死区：${deadZone.map((g) => `#${g.id} ${g.gap}px`).join(' | ')}`)
      return m
    }

    const first = await check('竖屏')

    // 能不能从头滚到尾：lenis 接管后用原生 scrollTo，滚到底再读一次位置。
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(900)
    const bottom = await page.evaluate(() => ({
      y: Math.round(window.scrollY),
      vh: window.innerHeight,
      docH: Math.round(document.documentElement.scrollHeight),
      footVisible: (() => {
        const f = document.querySelector('.foot')
        if (!f) return false
        const r = f.getBoundingClientRect()
        return r.top < window.innerHeight && r.bottom > 0
      })(),
    }))
    if (bottom.y + bottom.vh < bottom.docH - 4)
      probs.push(`${eng.name} 滚不到底：停在 ${bottom.y + bottom.vh}/${bottom.docH}`)
    if (!bottom.footVisible) probs.push(`${eng.name} 滚到底看不到页脚`)

    // 横屏往返：这是对真机 bug 的直接回归测试
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.setViewportSize({ width: 844, height: 390 })
    await page.waitForTimeout(1200)
    await scrollThrough(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(1400)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(600)
    const after = await check('横屏往返后')

    sheet.push(
      `${eng.name} 竖屏 doc=${first.docH} rail=${first.railH}/${first.railContent} 卡${first.cards}张；往返后 doc=${after.docH} rail=${after.railH}`,
    )
    await ctx.close()
    await b.close()
  }
  probs.length
    ? fail('21', '移动端可用性', [...new Set(probs)].join('\n      '))
    : pass('21', '移动端可用性', `390×844 双引擎：0 横向溢出、跑道无内联高度、track 无残留 transform、0 pin-spacer、0 单轴溢出、0 空白死区、能滚到页脚；横屏 844×390 往返后复测同样通过。${sheet.join('；')}`)
}

/* === 22. 可点性 ======================================================
   用户报的原话：「博客文章点不开」。这一关把所有该点得动的东西逐个验：
   六篇博客、六格花园 + 导航站、每张作品卡的两枚卡内按钮，以及全站不许
   出现 href 为空 / "#" 的链接壳子。桌面与移动两个断点各跑一遍。 */
if (want(22)) {
  const { CLICK_PROBE } = await import('./gates-mobile.mjs')
  const probs = []
  const sheet = []
  for (const vp of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await page.goto(URL_BASE, { waitUntil: 'load' })
    await page.waitForTimeout(1500)
    await scrollThrough(page)
    const { bad, info } = await page.evaluate(CLICK_PROBE)
    await ctx.close()
    if (info.posts !== 6) bad.push(`博客列表 ${info.posts} 条，应为 6`)
    if (info.cells !== 7) bad.push(`花园 ${info.cells} 格，应为 6 精选 + 1 导航站`)
    if (info.btns < 10) bad.push(`作品卡内按钮共 ${info.btns} 枚，六张卡至少 10 枚（4 张带 live + 6 张源码）`)
    for (const b of bad) probs.push(`${vp.name} ${b}`)
    sheet.push(`${vp.name} 博客${info.posts}条 花园${info.cells}格 卡内按钮${info.btns}枚 全站${info.links}个链接 0 死壳`)
  }
  probs.length ? fail('22', '可点性', [...new Set(probs)].join('\n      ')) : pass('22', '可点性', sheet.join('；'))
}

/* === 10. 滚动手感 ==================================================== */
if (want(10)) {
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
    if (now.medianDt > now.baseDt * 1.35) probs.push(`滚动时 ${now.medianDt}ms/帧，比空转基线 ${now.baseDt}ms 贵 35% 以上`)
    line =
      `${now.medianDt}ms/帧（空转基线 ${now.baseDt}ms）· 跟手 ${now.lagPx}px · 超调 ${now.overshootPct}% · ` +
      `停稳 ${now.settleMs}ms · jerk ${now.jerkRatio}（输入 ${now.inJerkRatio}，上限 ${jerkCap.toFixed(3)}）· ` +
      `掉帧连跑 ${now.worstDropRun}`
  }
  probs.length ? fail('10', '滚动手感', `${line}\n      未达标: ${probs.join('; ')}`) : pass('10', '滚动手感', line)
}

/* === 9. 字体子集覆盖 + 预算 + 设计系统硬规则 ========================== */
if (want(9)) {
  const FONTS = path.join(ROOT, 'public', 'fonts')
  const CHARS = path.join(ROOT, 'scripts', 'chars')
  /* v9 删掉了两档中文正文 Web 字体，正文改走苹果系统栈（详见下面的字体栈断言），
     所以这里只剩三个需要子集覆盖的自带字族。 */
  const FAMILY = {
    'noto sans sc black web': 'display',
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
  const BUDGET = 40
  if (total > BUDGET) probs.push(`字体总量 ${total.toFixed(1)} KB > ${BUDGET} KB 预算`)
  const files = await readdir(FONTS)
  for (const f of files) {
    if (!f.endsWith('.woff2')) continue
    const base = f.replace(/-(Regular|Semibold|Display|Numerals)?\.woff2$/, '').replace('.woff2', '')
    if (!files.some((x) => x.startsWith('LICENSE-') && x.includes(base))) probs.push(`${f} 缺少同名 LICENSE 文件`)
  }

  const cssRaw = await readFile(path.join(ROOT, 'src', 'styles', 'index.css'), 'utf8')
  const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, '')
  const html = await readFile(path.join(ROOT, 'index.html'), 'utf8')
  if (/\bInter\b/.test(css) || /\bInter\b/.test(html)) probs.push('仍有 Inter 引用')

  /* v9 的字体决策：正文交给系统栈，首位必须是 -apple-system（macOS/iOS 上落到
     苹方 / SF），后面按 Windows → Linux 依次兜底。苹方与 SF Pro 有授权限制，
     不能当 Web 字体分发，所以只能这么调，各端字形不完全一致是已知代价。
     同时确认 index.css 里已经没有任何正文中文 Web 字体的 @font-face。 */
  const sansDecl = (css.match(/--font-sans:\s*([^;]+);/) || [])[1] || ''
  const first = sansDecl.split(',')[0].trim().replace(/^["']|["']$/g, '')
  if (first !== '-apple-system') probs.push(`--font-sans 首位是 ${first || '(空)'}，应为 -apple-system`)
  for (const need of ['Microsoft YaHei', 'Noto Sans CJK SC']) {
    if (!sansDecl.includes(need)) probs.push(`--font-sans 缺 ${need} 兜底`)
  }
  const faceFams = [...css.matchAll(/@font-face\s*\{[^}]*?font-family:\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
  const bodyFace = faceFams.filter((f) => /noto sans sc web/i.test(f))
  if (bodyFace.length) probs.push(`index.css 仍有正文中文 @font-face：${bodyFace.join(' ')}`)
  const hexes = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0])
  if (hexes.length) probs.push(`index.css 里有 ${hexes.length} 处硬编码颜色：${hexes.slice(0, 6).join(' ')}`)
  if (/color-mix\(/.test(css)) probs.push('index.css 使用了被禁的 color-mix()')

  const covered = Object.entries(tables)
    .map(([k, v]) => `${k} ${v.size}字`)
    .join('、')
  probs.length
    ? fail('9', '字体子集 / 预算 / 设计系统规则', probs.join('\n      '))
    : pass(
        '9',
        '字体子集 / 预算 / 设计系统规则',
        `${covered}；四条路由 × 两个断点 0 缺字。总量 ${total.toFixed(1)} KB ≤ ${BUDGET} KB（${inv.join(' · ')}）。正文走系统栈，首位 -apple-system，Windows / Linux 各有兜底；0 处正文中文 @font-face、0 处 Inter、0 处硬编码色、0 处 color-mix()`,
      )
}

/* === 2. Lighthouse ================================================== */
if (want(2) && !SKIP_LH) {
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
  const presets = {
    desktop: { ...DESKTOP, url: URL_BASE, minPerf: 95 },
    mobile: {
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
      throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4, requestLatencyMs: 562.5, downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675 },
      url: URL_BASE,
      minPerf: 90,
    },
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
    }
  }
  await chrome.kill()
  await writeFile('/workspace/lighthouse.json', JSON.stringify(lhOut, null, 2))
  const probs = []
  for (const [name, v] of Object.entries(lhOut)) {
    /* 无节流的真实 PerformanceObserver 实测 CLS=0；Lighthouse 移动端 4x CPU 降速下
       字体 swap 会抖出 ~0.003 的瞬时位移，非结构性回流。阈值取 0.01（Google「良好」线为 0.1）。 */
    if (v.cls > 0.01) probs.push(`${name} CLS ${v.cls} > 0.01`)
    if (v.perf < v.minPerf) probs.push(`${name} Perf ${v.perf} < ${v.minPerf}`)
    if (v.a11y < 96) probs.push(`${name} A11y ${v.a11y} < 96 (${v.a11yFails.join(',') || '-'})`)
    if (v.bp < 100) probs.push(`${name} BP ${v.bp} < 100`)
    if (v.seo < 92) probs.push(`${name} SEO ${v.seo} < 92`)
    if (v.lcp >= 2.5) probs.push(`${name} LCP ${v.lcp}s ≥ 2.5`)
    if (v.tbt > (name === 'mobile' ? 150 : 50)) probs.push(`${name} TBT ${v.tbt}ms 超标`)
  }
  const line = Object.entries(lhOut)
    .map(
      ([n, v]) =>
        `${n.padEnd(8)} Perf ${String(v.perf).padStart(3)} / A11y ${v.a11y} / BP ${v.bp} / SEO ${v.seo} · LCP ${v.lcp}s · CLS ${v.cls} · TBT ${v.tbt}ms`,
    )
    .join('\n      ')
  probs.length ? fail('2', 'Lighthouse', `${line}\n      未达标: ${probs.join('; ')}`) : pass('2', 'Lighthouse', line)
} else if (want(2)) {
  pass('2', 'Lighthouse', 'skipped')
}

await browser.close()
server.close()

results.sort((a, b) => Number(a.id) - Number(b.id))
console.log('\n──────────── 验收结果 ────────────')
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id}. ${r.name}\n      ${r.detail}`)
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} 通过`)
await writeFile('/workspace/audit.json', JSON.stringify({ results, contrastReport }, null, 2))
process.exit(failed.length ? 1 : 0)
