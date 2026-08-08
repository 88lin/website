/**
 * 上线前自动验收。八项检查，任何一项 fail 都会让进程以非零码退出。
 * 用法：node scripts/audit.mjs [--skip-lh] [--skip-links]
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

// 故意挂在子路径下（GitHub Pages 的项目站就是 /website/），并开启 gzip 对齐线上传输
const { server, url: URL_BASE } = await serveDist({ dist: DIST, port: 4199 })

const results = []
const pass = (id, name, detail) => results.push({ id, name, ok: true, detail })
const fail = (id, name, detail) => results.push({ id, name, ok: false, detail })

/* ------------------------------------------------------------------ */
/* 对比度工具：sRGB 相对亮度 + alpha 合成                                */
/* ------------------------------------------------------------------ */
const parseRGB = (s) => {
  const m = s.match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number)
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
}
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
/*  a) Tailwind 4 会把 bg-paper/88 这类颜色编译成 oklab(...)，正则解析不了， */
/*     所以统一先丢进 canvas 让浏览器自己归一化成 rgba。                    */
/*  b) 本站的钴蓝/朱红色场是绝对定位的兄弟节点（.punch、-z-10），不是祖先，   */
/*     顺着 parentElement 往上找永远找不到，必须用 elementsFromPoint 拿到    */
/*     真正压在文字下面的那一摞。                                          */
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
    // 取元素与视口的交集作为采样区；比"整体入视口"宽松，超高标题也能测到
    const top = Math.max(r.top, 72) // 避开固定导航
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
    if (idx < 0) return // 被固定导航之类的东西盖住了，换个滚动位置再测
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
      await new Promise((r) => setTimeout(r, 130))
    }
    window.scrollTo(0, document.body.scrollHeight)
    await new Promise((r) => setTimeout(r, 500))
  })
}

/** 逐屏推进，边滚边采，直到没有新节点为止。 */
async function collectContrast(page, vpName) {
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
    () => document.querySelectorAll('[data-audit]:not([data-audit-done])').length
  )
  return { rows, total, missed, vpName }
}

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })

/* === 1. 子路径部署可用 =============================================== */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const bad = []
  const errs = []
  page.on('response', (r) => {
    if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`)
  })
  page.on('pageerror', (e) => errs.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(2500)
  const mounted = await page.evaluate(() => document.querySelectorAll('#root section').length)
  // v3 删掉了 WebGL 画布，这里改为复核「Tailwind 工具类没有被本地组件 CSS 盖掉」。
  // 踩过的坑：.work-card__shot 里写了 background，把排印封面的 bg-brand-surface
  // 全盖成了 --preview-bg，三张封面直接变成白底白字。
  const shadowed = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const hex = (v) => {
      const d = document.createElement('canvas').getContext('2d')
      d.fillStyle = v
      return d.fillStyle
    }
    const norm = (v) => {
      const d = document.createElement('canvas').getContext('2d')
      d.fillStyle = '#000'
      d.fillStyle = v
      return d.fillStyle
    }
    const bad = []
    for (const el of document.querySelectorAll('#root [class*="bg-"]')) {
      const m = String(el.className).match(/(?:^|\s)bg-([a-z-]+)(?:\s|$)/)
      if (!m) continue
      const token = root.getPropertyValue(`--color-${m[1]}`).trim()
      if (!token) continue
      const want = norm(hex(token))
      const got = norm(getComputedStyle(el).backgroundColor)
      if (want !== got) bad.push(`${el.tagName}.bg-${m[1]} 期望 ${want} 实得 ${got}`)
    }
    return [...new Set(bad)].slice(0, 8)
  })
  // 光看 4xx 不够：本地服务器会把缺前缀的路径 302 回首页，图片拿到一份 HTML
  // 就变成 complete=true / naturalWidth=0 的黑块，状态码全是 200。
  await scrollThrough(page)
  await page.waitForTimeout(1200)
  const imgs = await page.evaluate(() => {
    const out = []
    for (const i of document.querySelectorAll('img')) {
      i.loading = 'eager'
      out.push({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0 })
    }
    return out
  })
  await page.waitForTimeout(1500)
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter((i) => !(i.complete && i.naturalWidth > 0))
      .map((i) => i.currentSrc || i.src)
  )
  if (bad.length || errs.length || mounted < 9 || shadowed.length || broken.length) {
    fail(
      '1',
      '子路径部署 (/website/)',
      `404s=${bad.join('|') || 'none'} errors=${errs.join('|') || 'none'} sections=${mounted} 被覆盖的工具类=${shadowed.join(' | ') || 'none'} 解码失败的图=${broken.join('|') || 'none'}`
    )
  } else {
    pass(
      '1',
      '子路径部署 (/website/)',
      `${mounted} 个区块挂载、${imgs.length} 张位图全部解码成功、bg-* 工具类 0 处被组件 CSS 覆盖、0 个 4xx、0 个运行时错误`
    )
  }
  await ctx.close()
}

/* === 3. 对比度矩阵 =================================================== */
const contrastReport = []
let missedTotal = 0
for (const vp of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: 'reduce', // 让所有 GSAP 淡入直接落终态，避免漏检
  })
  const page = await ctx.newPage()
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1800)
  await scrollThrough(page)
  const { rows, missed } = await collectContrast(page, vp.name)
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
{
  const bad = contrastReport.filter((c) => !c.ok)
  const worst = [...contrastReport].sort((a, b) => a.ratio - b.ratio).slice(0, 5)
  if (bad.length) {
    fail(
      '3',
      '对比度 ≥ WCAG AA',
      bad.slice(0, 14).map((b) => `${b.vp} <${b.tag}> "${b.text}" ${b.ratio}:1 需 ${b.need} [${b.cls}]`).join('\n      ')
    )
  } else {
    pass(
      '3',
      '对比度 ≥ WCAG AA',
      `${contrastReport.length} 个文本节点全部达标（${missedTotal} 个未采到）；最低 ${worst
        .map((w) => `${w.ratio}:1(${w.text.slice(0, 8)})`)
        .join(', ')}`
    )
  }
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
      // 中文破折号是连续两个 U+2014，是合法排版；孤立的 — / – 才是 AI 味
      const stripped = code.replace(/\u2014\u2014/g, '')
      if (/[\u2014\u2013]/.test(stripped)) hits.push(`${path.relative(ROOT, f)}:${i + 1} ${line.trim().slice(0, 70)}`)
    })
  }
  hits.length ? fail('4', '无孤立 — / – 破折号', hits.join('\n      ')) : pass('4', '无孤立 — / – 破折号', `扫描 ${files.length} 个文件，0 命中`)
}

/* === 5. 版式纪律：eyebrow / 导航 / CTA 折行 ========================== */
{
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await scrollThrough(page)
  const m = await page.evaluate(() => {
    // eyebrow = 紧贴大标题之前、字号很小且字距很大的那种小标签。
    // v3 里它是设计系统明确要求的分区微标签（ds-scene-landing.md），
    // 所以判的不是「总数别太多」，而是「每个 section 至多一个、别乱撒」。
    let eyebrows = 0
    const perSection = new Map()
    document.querySelectorAll('h1,h2,h3').forEach((h) => {
      const prev = h.previousElementSibling
      if (!prev) return
      const cs = getComputedStyle(prev)
      const ls = parseFloat(cs.letterSpacing) || 0
      if (parseFloat(cs.fontSize) <= 15 && ls / parseFloat(cs.fontSize) >= 0.05 && prev.textContent.trim()) {
        eyebrows++
        const sec = h.closest('section[id]')
        const k = sec ? sec.id : '(none)'
        perSection.set(k, (perSection.get(k) || 0) + 1)
      }
    })
    const crowded = [...perSection].filter(([, n]) => n > 1).map(([k, n]) => `${k}×${n}`)
    // 区块内部也会用 <header>，必须精确锁定顶部那条固定导航
    const nav = document.querySelector('nav[aria-label="主导航"]') || document.querySelector('header nav')
    const navH = nav ? Math.round(nav.getBoundingClientRect().height) : -1
    // 单行 = 所有导航项的垂直中心落在同一条 6px 容差带内
    const mids = Array.from(nav ? nav.querySelectorAll('a, button') : []).map((a) => {
      const r = a.getBoundingClientRect()
      return r.top + r.height / 2
    })
    const navLines = mids.length ? (Math.max(...mids) - Math.min(...mids) <= 6 ? 1 : 2) : 0
    const navSpread = mids.length ? Math.round(Math.max(...mids) - Math.min(...mids)) : 0
    // 任意可点击元素的文字被折成两行都算问题
    const wrapped = []
    document.querySelectorAll('a,button').forEach((el) => {
      const t = Array.from(el.childNodes).find((n) => n.nodeType === 3 && n.textContent.trim())
      if (!t) return
      const r = document.createRange()
      r.selectNodeContents(t)
      if (r.getClientRects().length > 1) wrapped.push((el.textContent || '').trim().slice(0, 24))
    })
    return { eyebrows, crowded, navH, navLines, navSpread, wrapped }
  })
  await ctx.close()
  const probs = []
  if (m.crowded.length) probs.push(`同一区块出现多个 eyebrow: ${m.crowded.join(', ')}`)
  if (m.navH > 80) probs.push(`导航高 ${m.navH}px > 80`)
  if (m.navLines > 1) probs.push(`导航折成 ${m.navLines} 行（中心线偏差 ${m.navSpread}px）`)
  if (m.wrapped.length) probs.push(`CTA/链接折行: ${m.wrapped.join(', ')}`)
  probs.length
    ? fail('5', '版式纪律 (1024px)', probs.join('; '))
    : pass(
        '5',
        '版式纪律 (1024px)',
        `eyebrow ${m.eyebrows} 个（每区块至多 1 个）、导航 ${m.navH}px 单行（中心线偏差 ${m.navSpread}px）、0 处链接折行`
      )
}

/* === 6. prefers-reduced-motion 降级 ==================================
   自动滚动是这一版唯一的长动画，必须能被系统偏好关停并退回原生横滑；
   顺带确认降级下 GSAP 入场元素全部可见（不能有停在 opacity:0 的区块）。 */
{
  const probs = []
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await scrollThrough(page)
  const m = await page.evaluate(() => {
    const track = document.querySelector('.hscroll__track')
    const wrap = document.querySelector('.hscroll')
    const t0 = track ? getComputedStyle(track).transform : 'none'
    const hiddenFades = [...document.querySelectorAll('.js-fade')].filter(
      (e) => Number(getComputedStyle(e).opacity) < 0.9,
    ).length
    const clonesShown = [...document.querySelectorAll('.hscroll__item[data-clone="true"]')].filter(
      (e) => getComputedStyle(e).display !== 'none',
    ).length
    return {
      anim: track ? getComputedStyle(track).animationName : 'missing',
      transform: t0,
      overflowX: wrap ? getComputedStyle(wrap).overflowX : 'missing',
      snap: wrap ? getComputedStyle(wrap).scrollSnapType : 'missing',
      fades: document.querySelectorAll('.js-fade').length,
      hiddenFades,
      clonesShown,
    }
  })
  await page.waitForTimeout(1200)
  const moved = await page.evaluate(() =>
    document.querySelector('.hscroll__track')
      ? getComputedStyle(document.querySelector('.hscroll__track')).transform
      : 'none',
  )
  const ov = await page.evaluate(findOverflow)
  await ctx.close()

  if (m.anim !== 'none') probs.push(`轨道动画未停：animation-name=${m.anim}`)
  if (m.transform !== moved) probs.push(`轨道仍在位移：${m.transform} → ${moved}`)
  if (!/auto|scroll/.test(m.overflowX)) probs.push(`降级后未退回原生横滑：overflow-x=${m.overflowX}`)
  if (m.snap === 'none') probs.push('降级后缺少 scroll-snap')
  if (m.clonesShown) probs.push(`降级后仍显示 ${m.clonesShown} 个克隆项（会出现重复卡片）`)
  if (m.hiddenFades) probs.push(`${m.hiddenFades}/${m.fades} 个入场元素停在 opacity<0.9`)
  if (ov.length) probs.push(`横向溢出 ${ov.length} 处：${ov.slice(0, 3).join(' | ')}`)
  if (errs.length) probs.push(`运行时错误：${errs.slice(0, 3).join(' | ')}`)

  probs.length
    ? fail('6', 'prefers-reduced-motion 降级', probs.join('; '))
    : pass(
        '6',
        'prefers-reduced-motion 降级',
        `轨道动画停止且不再位移、退回 overflow-x:${m.overflowX} + ${m.snap}、克隆项隐藏、${m.fades} 个入场元素全部可见、0 溢出 0 错误`,
      )
}

/* === 7. 用户点名的三处 bug 的硬断言 ==================================
   ① 数字花园里没有一个方角按钮（上一版 41 个 <a> 的 border-radius 全是 0px）
   ② 写作区右侧每一行都能点开对应文章（上一版整区只有 1 个 <a>）
   ③ 两个视口都没有元素撑破视口（上一版作品卡右边缘到 1969px）
   顺带盯住「九个区块版式必须互不相同」这条设计系统硬规则。            */
{
  const probs = []
  let detail = ''
  let articleHrefs = []
  for (const vp of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: 'reduce', // 让 GSAP 淡入直接落终态，避免把未入场元素判成缺失
    })
    const page = await ctx.newPage()
    await page.goto(URL_BASE, { waitUntil: 'load' })
    await page.waitForTimeout(1500)
    await scrollThrough(page)

    const m = await page.evaluate(() => {
      // 只看「按钮 / 标签」这类有形状的可点元素；正文里的 .link 是带下划线的
      // 行内链接，本来就不该有边框和圆角
      const radii = []
      for (const el of document.querySelectorAll('#garden a, #garden button')) {
        const cs = getComputedStyle(el)
        if (cs.borderTopWidth === '0px' && cs.backgroundColor === 'rgba(0, 0, 0, 0)') continue
        const r = parseFloat(cs.borderRadius) || 0
        const h = el.getBoundingClientRect().height
        // 999px 会被计算成 min(半宽,半高)；用「圆角 >= 半高 - 1」判定真胶囊
        radii.push({ r, pill: r >= h / 2 - 1, txt: (el.textContent || '').trim().slice(0, 10) })
      }
      const arts = [...document.querySelectorAll('#writing a')]
        .map((a) => a.href)
        .filter((h) => /\/article\//.test(h))
      // 版式指纹：每个 section 的栅格模板 + 背景 + 首个标题的位置，九个不能重样。
      // 只算九个顶层区块；写作区内部按年份分组的 <section> 本来就该长一样。
      const prints = [...document.querySelectorAll('#root section[id]')].map((s) => {
        const cs = getComputedStyle(s)
        const inner = s.querySelector(':scope > div, :scope > *')
        const ics = inner ? getComputedStyle(inner) : cs
        const h2 = s.querySelector('h2, h1')
        const hx = h2 ? Math.round(h2.getBoundingClientRect().left) : -1
        const cols = [...s.querySelectorAll('*')]
          .map((e) => getComputedStyle(e).gridTemplateColumns)
          .filter((v) => v && v !== 'none')
          .slice(0, 3)
          .join('|')
        return `${s.id}::${cs.backgroundColor}|${ics.display}|h@${hx}|${cols}`
      })
      return { radii, arts, prints }
    })

    // 防止「把选择器收窄到只剩两个元素」式的假通过
    if (m.radii.length < 40) probs.push(`${vp.name} 数字花园只采到 ${m.radii.length} 个可点元素 < 40`)
    const square = m.radii.filter((x) => !x.pill)
    if (square.length) {
      probs.push(
        `${vp.name} 数字花园有 ${square.length}/${m.radii.length} 个非胶囊：` +
          square
            .slice(0, 5)
            .map((s) => `"${s.txt}" r=${s.r}px`)
            .join(', '),
      )
    }
    if (m.arts.length < 12) probs.push(`${vp.name} 写作区指向 /article/ 的链接只有 ${m.arts.length} 个 < 12`)
    articleHrefs = [...new Set([...articleHrefs, ...m.arts])]

    const ov = await page.evaluate(findOverflow)
    if (ov.length) probs.push(`${vp.name} 横向溢出 ${ov.length} 处：${ov.slice(0, 3).join(' | ')}`)

    if (vp.name === 'desktop') {
      const dup = m.prints.length - new Set(m.prints).size
      if (dup > 0) probs.push(`九个区块版式指纹重复 ${dup} 组：${m.prints.join('\n        ')}`)
      detail =
        `数字花园 ${m.radii.length} 个可点元素全部是胶囊（0 个方角）、` +
        `写作区 ${m.arts.length} 条文章链接、两视口 0 处横向溢出、` +
        `${m.prints.length} 个区块版式指纹互不相同`
    }
    await ctx.close()
  }
  globalThis.__articleHrefs = articleHrefs
  probs.length ? fail('7', '交互与版式硬断言', probs.join('\n      ')) : pass('7', '交互与版式硬断言', detail)
}

/* === 8. 外链可达性 =================================================== */
if (!SKIP_LINKS) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await scrollThrough(page)
  const all = await page.evaluate(() =>
    Array.from(new Set(Array.from(document.querySelectorAll('a[href^="http"]')).map((a) => a.href)))
  )
  await ctx.close()
  // 写作区一口气 55 条同源文章链接，全打过去会被博客边缘节点限流误判成死链。
  // 非文章链接全查，文章链接抽 15 条（PLAN 只要求 ≥12 条可达）。
  const arts = all.filter((h) => /\/article\//.test(h))
  const rest = all.filter((h) => !/\/article\//.test(h))
  const step = Math.max(1, Math.floor(arts.length / 15))
  const sampled = arts.filter((_, i) => i % step === 0).slice(0, 15)
  const hrefs = [...rest, ...sampled]
  const dead = []
  // 55 个外链并发打过去，边缘节点会偶发 429/503。5xx 与 429 退避重试两次再判死。
  const hit = (h) => {
    try {
      return Number(
        execFileSync(
          'curl',
          ['-sSL', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '25', '-A', UA, h],
          { encoding: 'utf8' }
        ).trim()
      )
    } catch {
      return 0
    }
  }
  const UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'
  await Promise.all(
    hrefs.map(async (h) => {
      let code = hit(h)
      for (let i = 0; i < 2 && (code === 0 || code === 429 || code >= 500); i++) {
        await new Promise((r) => setTimeout(r, 2500 * (i + 1)))
        code = hit(h)
      }
      if (code === 0) dead.push(`ERR ${h}`)
      else if (code >= 400) dead.push(`${code} ${h}`)
    })
  )
  dead.length
    ? fail('8', '外链可达', `${dead.length}/${hrefs.length} 不可达:\n      ${dead.join('\n      ')}`)
    : pass(
        '8',
        '外链可达',
        `${hrefs.length} 个链接全部 <400（${rest.length} 个站外链接全查 + ${sampled.length}/${arts.length} 条文章链接抽查）`,
      )
} else {
  pass('8', '外链可达', 'skipped')
}

await browser.close()

/* === 2. Lighthouse ================================================== */
if (!SKIP_LH) {
  const lighthouse = (await import('lighthouse')).default
  const { launch } = await import('chrome-launcher')
  const chromePath = chromium.executablePath()
  const chrome = await launch({
    chromePath,
    chromeFlags: ['--headless=new', '--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  })
  const presets = {
    desktop: {
      formFactor: 'desktop',
      screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
      throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
      minPerf: 90,
    },
    mobile: {
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
      throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4, requestLatencyMs: 562.5, downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675 },
      minPerf: 90,
    },
  }
  const lhOut = {}
  // v3 删掉了 three.js，页面上已经没有需要软件光栅的东西，直接跑真实页面卡验收。
  for (const [name, p] of Object.entries(presets)) {
    const r = await lighthouse(
      URL_BASE,
      { port: chrome.port, output: 'json', logLevel: 'error' },
      {
        extends: 'lighthouse:default',
        settings: {
          formFactor: p.formFactor,
          screenEmulation: p.screenEmulation,
          throttling: p.throttling,
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        },
      }
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
    if (v.a11y < 96) probs.push(`${name} A11y ${v.a11y} < 96 (${v.a11yFails.join(',') || '-'})`)
    if (v.cls > 0) probs.push(`${name} CLS ${v.cls} > 0`)
    if (v.perf < v.minPerf) probs.push(`${name} Perf ${v.perf} < ${v.minPerf}`)
    if (v.lcp >= 2.5) probs.push(`${name} LCP ${v.lcp}s ≥ 2.5`)
  }
  const line = Object.entries(lhOut)
    .map(
      ([n, v]) =>
        `${n.padEnd(8)} Perf ${String(v.perf).padStart(3)} / A11y ${v.a11y} / BP ${v.bp} / SEO ${v.seo} · LCP ${v.lcp}s · CLS ${v.cls} · TBT ${v.tbt}ms`
    )
    .join('\n      ')
  probs.length ? fail('2', 'Lighthouse', `${line}\n      未达标: ${probs.join('; ')}`) : pass('2', 'Lighthouse', line)
} else {
  pass('2', 'Lighthouse', 'skipped')
}

/* === 7. 见 browser 段（胶囊圆角 / 文章链接 / 横向溢出 / 版式去重） ==== */

/* === 9. 字体子集覆盖 + 预算 + 设计系统硬规则 ==========================
   衬线标题与无衬线中黑各有一份子集，任何一个字漏掉都会当场掉回系统字。
   顺带卡死两条 brand-dna 规则：0 处 Inter、样式文件里 0 处硬编码品牌色。 */
{
  const FONTS = path.join(ROOT, 'public', 'fonts')
  const buckets = {
    serif: {
      chars: new Set(await readFile(path.join(ROOT, 'scripts', 'serif-chars.txt'), 'utf8')),
      file: 'NotoSerifSC-Display.woff2',
      label: '衬线标题',
      missing: new Set(),
    },
    bold: {
      chars: new Set(await readFile(path.join(ROOT, 'scripts', 'display-chars.txt'), 'utf8')),
      file: 'NotoSansSC-Semibold.woff2',
      label: '无衬线中黑',
      missing: new Set(),
    },
  }
  const b = await chromium.launch()
  for (const vp of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 1024, height: 768 },
  ]) {
    const pg = await b.newPage({ viewport: vp })
    await pg.goto(URL_BASE, { waitUntil: 'networkidle' })
    await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await pg.waitForTimeout(700)
    const got = await pg.evaluate(() => {
      const s = new Set()
      const w = new Set()
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el)
        const isSerif = cs.fontFamily.includes('Noto Serif SC Web')
        if (!isSerif && parseInt(cs.fontWeight, 10) < 501) continue
        const bucket = isSerif ? s : w
        for (const n of el.childNodes)
          if (n.nodeType === 3 && n.nodeValue) for (const c of n.nodeValue) bucket.add(c)
      }
      return { serif: [...s].join(''), bold: [...w].join('') }
    })
    for (const c of got.serif) if (!buckets.serif.chars.has(c) && c.trim()) buckets.serif.missing.add(c)
    for (const c of got.bold) if (!buckets.bold.chars.has(c) && c.trim()) buckets.bold.missing.add(c)
    await pg.close()
  }
  await b.close()

  const probs = []
  const lines = []
  for (const k of Object.keys(buckets)) {
    const v = buckets[k]
    const kb = (await stat(path.join(FONTS, v.file))).size / 1024
    const cjk = [...v.chars].filter((c) => /[\u4e00-\u9fff]/.test(c)).length
    if (v.missing.size) probs.push(`${v.label}子集缺字（会掉回系统字）：${[...v.missing].join('')}`)
    lines.push(`${v.label} ${v.chars.size} 字 / ${cjk} 汉字 / ${kb.toFixed(1)} KB`)
  }
  let total = 0
  const inv = []
  for (const f of await readdir(FONTS)) {
    if (!f.endsWith('.woff2')) continue
    const kb = (await stat(path.join(FONTS, f))).size / 1024
    total += kb
    inv.push(`${f.replace('.woff2', '')} ${kb.toFixed(0)}`)
  }
  if (total > 200) probs.push(`字体总量 ${total.toFixed(1)} KB > 200 KB 预算`)

  // brand-dna：字体只能来自推荐池；样式里不许出现硬编码品牌色（一律走 token）
  const css = await readFile(path.join(ROOT, 'src', 'styles', 'index.css'), 'utf8')
  const html = await readFile(path.join(ROOT, 'index.html'), 'utf8')
  if (/\bInter\b/.test(css) || /\bInter\b/.test(html)) probs.push('仍有 Inter 引用')
  // palettes.css 是唯一允许写十六进制的地方；index.css 里出现即违规
  const hex = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]).filter((h) => h !== '#000')
  if (hex.length) probs.push(`index.css 里有 ${hex.length} 处硬编码颜色：${hex.slice(0, 6).join(' ')}`)
  if (/color-mix\(/.test(css)) probs.push('index.css 使用了被禁的 color-mix()')

  probs.length
    ? fail('9', '字体子集 / 预算 / 设计系统规则', probs.join('\n      '))
    : pass(
        '9',
        '字体子集 / 预算 / 设计系统规则',
        `${lines.join('；')}；三个断点 0 缺字。总量 ${total.toFixed(1)} KB ≤ 200 KB（${inv.join(' · ')}）。0 处 Inter、0 处硬编码色、0 处 color-mix()`,
      )
}

server.close()

results.sort((a, b) => a.id.localeCompare(b.id))
console.log('\n──────────── 验收结果 ────────────')
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id}. ${r.name}\n      ${r.detail}`)
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} 通过`)
await writeFile('/workspace/audit.json', JSON.stringify({ results, contrastReport }, null, 2))
process.exit(failed.length ? 1 : 0)
