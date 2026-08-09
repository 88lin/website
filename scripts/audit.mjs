/**
 * 上线前自动验收。十二项检查，任何一项 fail 都会让进程以非零码退出。
 * 1 子路径部署 · 2 Lighthouse · 3 对比度 · 4 破折号 · 5 版式纪律 ·
 * 6 reduced-motion 降级 · 7 交互与版式硬断言 · 8 外链可达 · 9 字体与设计系统规则 ·
 * 10 滚动手感 · 11 3D 活字门禁与降级 · 12 作品轨道拖拽与惯性
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
      // 判据 V4 收紧一次，改成按「排版职能」判而不是按字符判：
      //   连续两个 U+2014 = 中文破折号，合法
      //   紧排（两侧无空格）的 U+2013 = 连接号本职：2022–2026、正则字符类 [a-z–]，合法
      //   剩下的都是空格分隔的插入语破折号 — 这个才是要抓的 AI 味
      const stripped = code.replace(/\u2014\u2014/g, '').replace(/(?<=\S)\u2013(?=\S)/g, '')
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
      const txt = (prev.textContent || '').trim()
      // 序号（01 / 02 / 03）不是 eyebrow，是列表记号。eyebrow 必须是「词」。
      if (!txt || /^[\d\s./·]+$/.test(txt)) return
      if (parseFloat(cs.fontSize) <= 15 && ls / parseFloat(cs.fontSize) >= 0.05) {
        eyebrows++
        const sec = h.closest('section[id]')
        const k = sec ? sec.id : '(none)'
        perSection.set(k, (perSection.get(k) || 0) + 1)
      }
    })
    const crowded = [...perSection].filter(([, n]) => n > 1).map(([k, n]) => `${k}×${n}`)
    // V4 结构签名：每个区块恰好一条竖排微标签挂在基准线上，多一条少一条都是漏改
    const railBad = []
    document.querySelectorAll('#root section[id]').forEach((s) => {
      const n = s.querySelectorAll('.eyebrow--rail').length
      if (n !== 1) railBad.push(`${s.id}=${n}`)
    })
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
    return { eyebrows, crowded, railBad, navH, navLines, navSpread, wrapped }
  })
  await ctx.close()
  const probs = []
  if (m.crowded.length) probs.push(`同一区块出现多个 eyebrow: ${m.crowded.join(', ')}`)
  if (m.railBad.length) probs.push(`基准线微标签数量不为 1: ${m.railBad.join(', ')}`)
  if (m.navH > 80) probs.push(`导航高 ${m.navH}px > 80`)
  if (m.navLines > 1) probs.push(`导航折成 ${m.navLines} 行（中心线偏差 ${m.navSpread}px）`)
  if (m.wrapped.length) probs.push(`CTA/链接折行: ${m.wrapped.join(', ')}`)
  probs.length
    ? fail('5', '版式纪律 (1024px)', probs.join('; '))
    : pass(
        '5',
        '版式纪律 (1024px)',
        `基准线竖排微标签 9 个区块各 1 条、行内 eyebrow ${m.eyebrows} 个（每区块至多 1 个）、导航 ${m.navH}px 单行（中心线偏差 ${m.navSpread}px）、0 处链接折行`
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
    const track = document.querySelector('.wtrack__inner')
    const wrap = document.querySelector('.wtrack')
    const t0 = track ? getComputedStyle(track).transform : 'none'
    const hiddenFades = [...document.querySelectorAll('.js-fade')].filter(
      (e) => Number(getComputedStyle(e).opacity) < 0.9,
    ).length
    const clonesShown = [...document.querySelectorAll('.wtrack__item[data-clone="true"]')].filter(
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
      // v4 新增的三条动效地基，降级下必须一并停掉
      canvas3d: !!document.querySelector('canvas#stage'),
      stage: window.__typeStage ? { ok: window.__typeStage.ok, reason: window.__typeStage.reason } : null,
      sv: getComputedStyle(document.documentElement).getPropertyValue('--sv').trim(),
      drag: window.__wtrack ? window.__wtrack.state.v : null,
    }
  })
  await page.waitForTimeout(1200)
  const moved = await page.evaluate(() =>
    document.querySelector('.wtrack__inner')
      ? getComputedStyle(document.querySelector('.wtrack__inner')).transform
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
  if (m.canvas3d) probs.push('降级下仍挂了 3D canvas')
  if (m.stage && m.stage.ok) probs.push(`降级下 3D 仍判定为可用（reason=${m.stage.reason ?? '-'}）`)
  if (m.sv && Math.abs(parseFloat(m.sv)) > 0.0001) probs.push(`速度总线未归零：--sv=${m.sv}`)
  if (m.drag !== null && Math.abs(m.drag) > 0.0001) probs.push(`轨道惯性未停：v=${m.drag}`)
  if (ov.length) probs.push(`横向溢出 ${ov.length} 处：${ov.slice(0, 3).join(' | ')}`)
  if (errs.length) probs.push(`运行时错误：${errs.slice(0, 3).join(' | ')}`)

  probs.length
    ? fail('6', 'prefers-reduced-motion 降级', probs.join('; '))
    : pass(
        '6',
        'prefers-reduced-motion 降级',
        `轨道动画停止且不再位移、退回 overflow-x:${m.overflowX} + ${m.snap}、克隆项隐藏、` +
          `${m.fades} 个入场元素全部可见、0 个 3D canvas、--sv 归零、0 溢出 0 错误`,
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

    // ④ 轨道封面不能空白滑进来。浏览器对 loading="lazy" 的横轴几乎没有提前量，
    //    卡片要滑到视口内约 40% 才开始请求；Work 里用 IntersectionObserver 在
    //    分区接近视口时把整条轨道的图转成 eager。这里守住它别被改回去。
    await page.evaluate(() => document.querySelector('#work')?.scrollIntoView({ block: 'start' }))
    await page.waitForTimeout(1200)
    const blank = await page.$$eval('#work img', (n) =>
      n.filter((e) => e.naturalWidth === 0).map((e) => (e.getAttribute('src') || '?').split('/').pop()),
    )
    if (blank.length) probs.push(`${vp.name} 轨道有 ${blank.length} 张封面滑入时仍空白：${blank.join(', ')}`)

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
      // 版式指纹（下限）：栅格模板 + 背景 + 首个标题的位置，九个不能重样。
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

      // 六元组版式指纹（真正的门槛）。
      //
      // 上面那条只查「完全一样」，太松了 —— v3 九个区块的指纹串各不相同，
      // 但骨架全是「eyebrow + 标题 + 一段引言 + 一排卡片」，看下来就是同一页
      // 重复九次。这里改成量化六个结构维度，再要求任意两块至少三处不同，
      // 换背景色和换文案糊弄不过去。
      const q = (n, s) => Math.round(n / s) * s
      const prints6 = [...document.querySelectorAll('#root section[id]')].map((s) => {
        const body = s.querySelector('.sec__body') || s
        const br = body.getBoundingClientRect()
        const h = s.querySelector('h1, h2')
        const hr = h ? h.getBoundingClientRect() : null

        // ③ 主分栏：body 里「真的把内容切成多栏」的那个最宽后代
        const splits = []
        for (const e of body.querySelectorAll('*')) {
          const cs = getComputedStyle(e)
          const r = e.getBoundingClientRect()
          if (r.width < 200 || r.height < 40) continue
          if (cs.display.includes('grid')) {
            const t = cs.gridTemplateColumns
            const n = t === 'none' ? 1 : t.trim().split(/\s+/).length
            if (n >= 2) splits.push({ k: `grid${n}`, w: r.width, r })
          } else if (cs.display.includes('flex') && cs.flexDirection === 'row') {
            const kids = [...e.children].filter((c) => c.getBoundingClientRect().width > 40)
            if (kids.length >= 2) splits.push({ k: `flexrow${kids.length}`, w: r.width, r })
          } else if (cs.columnCount && cs.columnCount !== 'auto' && +cs.columnCount >= 2) {
            splits.push({ k: `cols${cs.columnCount}`, w: r.width, r })
          }
        }
        splits.sort((a, b) => b.w - a.w)
        const main = splits[0] || null

        // ④ 标题与主分栏的位置关系
        let rel = 'none'
        if (main && hr) {
          const r = main.r
          if (r.top >= hr.bottom - 4) rel = 'below'
          else if (r.bottom <= hr.top + 4) rel = 'above'
          else if (r.left <= hr.left + 4 && r.right >= hr.right - 4 && r.top <= hr.top + 4) rel = 'inside'
          else rel = 'beside'
        }

        // ⑤ 出血：body 里有元素越出版心左右缘
        const bleed = [...body.querySelectorAll('*')].some((e) => {
          const r = e.getBoundingClientRect()
          return r.width > 0 && (r.left < br.left - 6 || r.right > br.right + 6)
        })

        // ⑥ sticky（必须排除基准线标签，否则九块全都有，这一维就没信息量了）
        const sticky = [...s.querySelectorAll('*')].some(
          (e) => getComputedStyle(e).position === 'sticky' && !e.classList.contains('eyebrow--rail'),
        )

        return {
          id: s.id,
          f: [
            `w${hr ? Math.round((hr.width / br.width) * 100 / 12) : -1}`, // ① 标题占版心宽度的档位
            `fs${h ? q(parseFloat(getComputedStyle(h).fontSize), 12) : -1}`, // ② 标题字号档
            main ? main.k : 'nosplit', // ③ 主分栏
            rel, // ④ 标题与主分栏的关系
            `bl${bleed ? 1 : 0}`, // ⑤ 出血
            `st${sticky ? 1 : 0}`, // ⑥ sticky
          ],
        }
      })
      return { radii, arts, prints, prints6 }
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

    // 版式指纹只在 desktop 判：1024px 下 lg 栅格全塌成单列，正好把差异抹平了
    if (vp.name === 'desktop') {
      const dup = m.prints.length - new Set(m.prints).size
      if (dup > 0) probs.push(`九个区块版式指纹重复 ${dup} 组：${m.prints.join('\n        ')}`)

      const near = []
      let minDiff = 6
      for (let i = 0; i < m.prints6.length; i++) {
        for (let j = i + 1; j < m.prints6.length; j++) {
          const a = m.prints6[i]
          const b = m.prints6[j]
          const d = a.f.filter((v, k) => v !== b.f[k]).length
          if (d < minDiff) minDiff = d
          if (d < 3) near.push(`${a.id} ↔ ${b.id} 只有 ${d} 处不同\n          ${a.f.join(' ')}\n          ${b.f.join(' ')}`)
        }
      }
      if (near.length) probs.push(`版式骨架撞型 ${near.length} 组（六维至少要有三维不同）：\n        ${near.join('\n        ')}`)
      detail =
        `数字花园 ${m.radii.length} 个可点元素全部是胶囊（0 个方角）、` +
        `写作区 ${m.arts.length} 条文章链接、轨道 6 张封面无空白滑入、` +
        `两视口 0 处横向溢出、${m.prints.length} 个区块版式指纹互不相同、` +
        `六维骨架两两最少 ${minDiff} 处不同（门槛 3）`
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

/* === 11. 3D 活字：能力分级门禁与降级 =================================
   3D 只有在「跑得动 + 用户没关动效 + 屏幕够宽」时才该出现，其余情况必须
   干净地退回 DOM 活字方阵。这条检查守两件事：
     a) 门禁真的按能力分级，不是无脑挂 canvas；
     b) 两种表现形式永远只出现一种，不会叠成两排字。
   沙箱是 SwiftShader，天然落在「跑不动」那一档，正好把降级路径测实；
   `?force3d=1` 只放行性能类判据，用来在同一台机器上把 3D 路径也跑一遍。 */
{
  const probs = []
  const notes = []
  const withQ = (u, s) => u + (u.includes('?') ? '&' : '?') + s

  /* (a) 桌面 + force3d：真的跑起来，且三个锚点各自换阵型 */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
    await page.goto(withQ(URL_BASE, 'force3d=1'), { waitUntil: 'networkidle' })

    // three 必须是懒加载：首屏解析完不能出现它的 <script>
    const early = await page.evaluate(
      () => [...document.querySelectorAll('script[src]')].filter((s) => /three|Stage/.test(s.src)).length,
    )
    if (early) probs.push(`首屏就带了 ${early} 个 three/Stage script 标签（懒加载失效）`)

    await page.waitForTimeout(4200)
    const boot = await page.evaluate(() => ({
      ...window.__typeStage,
      canvas: !!document.querySelector('canvas#stage'),
    }))
    if (!boot.ok) probs.push(`force3d 下仍未启用：${boot.reason}`)
    if (!boot.canvas) probs.push('force3d 下没有 canvas#stage')
    // draw call 是这套东西唯一的性能开关：一帧超过 3 次就说明合批塌了
    if ((boot.calls ?? 99) > 3) probs.push(`一帧 ${boot.calls} 次 draw call > 3`)

    const want = { top: 'forme', stack: 'cluster', contact: 'fall' }
    const got = {}
    for (const id of Object.keys(want)) {
      await page.evaluate((i) => {
        const el = document.getElementById(i)
        if (!el) return
        if (window.__lenis) window.__lenis.scrollTo(el, { offset: -60, immediate: true })
        else el.scrollIntoView()
      }, id)
      await page.waitForTimeout(2200)
      const st = await page.evaluate(() => ({ ...window.__typeStage }))
      got[id] = st.mode
      if (st.mode !== want[id]) probs.push(`#${id} 阵型是 ${st.mode}，应为 ${want[id]}`)
      if (!st.running) probs.push(`#${id} 渲染循环没在跑`)
    }

    // 无锚点的区块必须停帧。别在用户看不见 3D 的时候空转烧电。
    // （不能拿「滚到底」当判据：底部 contact 的锚点还在视口里，running 本就该是 true）
    await page.evaluate(() => {
      const el = document.getElementById('writing')
      if (window.__lenis) window.__lenis.scrollTo(el, { offset: -60, immediate: true })
      else el?.scrollIntoView()
    })
    await page.waitForTimeout(2200)
    const idle = await page.evaluate(() => ({ ...window.__typeStage }))
    if (idle.running) probs.push('滚到无锚点区块 #writing 时渲染循环没停')
    if (errs.length) probs.push(`3D 运行时错误：${errs.slice(0, 2).join(' | ')}`)
    notes.push(
      `force3d：ok · ${boot.calls} draw call · 阵型 ${Object.entries(got).map(([k, v]) => `${k}→${v}`).join(' ')} · #writing 停帧`,
    )
    await ctx.close()
  }

  /* (b) 三种降级路径：两种表现形式永远只出现一种 */
  const lanes = [
    { name: '桌面软件渲染', vp: { width: 1440, height: 900 }, rm: null, must3d: false },
    { name: '移动 390', vp: { width: 390, height: 844 }, rm: null, must3d: false },
    { name: '桌面 + reduced-motion', vp: { width: 1440, height: 900 }, rm: 'reduce', must3d: false },
  ]
  for (const lane of lanes) {
    const ctx = await browser.newContext({
      viewport: lane.vp,
      ...(lane.rm ? { reducedMotion: lane.rm } : {}),
    })
    const page = await ctx.newPage()
    await page.goto(URL_BASE, { waitUntil: 'load' })
    await page.waitForTimeout(2600)
    const s = await page.evaluate(() => {
      const tm = document.querySelector('#top .type-matrix')
      const r = tm ? tm.getBoundingClientRect() : null
      return {
        canvas: !!document.querySelector('canvas#stage'),
        ok: window.__typeStage ? !!window.__typeStage.ok : null,
        reason: window.__typeStage ? window.__typeStage.reason : null,
        matrix: !!(tm && Number(getComputedStyle(tm).opacity) > 0.9 && r.width > 40 && r.height > 40),
        slugs: tm ? tm.querySelectorAll('.type-slug').length : 0,
      }
    })
    // 契约：3D 在，DOM 方阵让位；3D 不在，DOM 方阵必须顶上 —— 不能两个都在，也不能都没有
    if (s.canvas && s.matrix) probs.push(`${lane.name}：3D 和 DOM 活字同时可见（会叠成两排字）`)
    if (!s.canvas && !s.matrix) probs.push(`${lane.name}：3D 没起来，DOM 活字方阵也没顶上`)
    if (lane.rm && s.ok) probs.push(`${lane.name}：用户关了动效，3D 仍判定为可用`)
    if (lane.vp.width < 768 && s.canvas) probs.push(`${lane.name}：窄屏不该上 3D`)
    if (!s.canvas && s.slugs < 4) probs.push(`${lane.name}：降级方阵只有 ${s.slugs} 枚字`)
    notes.push(`${lane.name}：${s.canvas ? '3D' : `DOM ${s.slugs} 枚字`}（${s.reason ?? 'ok'}）`)
    await ctx.close()
  }

  probs.length
    ? fail('11', '3D 活字门禁与降级', probs.join('\n      '))
    : pass('11', '3D 活字门禁与降级', notes.join('\n      '))
}

/* === 12. 作品轨道：拖拽 / 动量 / 巡航 ================================
   「滑动手感不行」是这一版的起点，所以轨道不能只测「它在动」。
   拆成四段分别断言：跟手、松手后的惯性、静置后自己接回巡航、键盘也能推。 */
{
  const probs = []
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(URL_BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1400)
  await page.evaluate(() => document.querySelector('#work')?.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(1600)

  const has = await page.evaluate(() => !!(window.__wtrack && window.__wtrack.state))
  let detail = ''
  if (!has) {
    probs.push('拿不到 window.__wtrack —— 轨道没挂上拖拽')
  } else {
    const box = await page.$eval('.wtrack', (e) => {
      const r = e.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    })
    const cx = box.x + box.w * 0.72
    const cy = box.y + box.h / 2
    const read = () => page.evaluate(() => ({ ...window.__wtrack.state }))

    // ① 跟手：拖多少走多少，中间不许有橡皮筋或倍率
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    const s0 = await read()
    const DRAG = -400
    for (let i = 1; i <= 20; i++) {
      await page.mouse.move(cx + (DRAG / 20) * i, cy)
      await page.waitForTimeout(16)
    }
    const s1 = await read()
    const follow = s1.x - s0.x
    if (Math.abs(follow - DRAG) > 20) probs.push(`跟手误差 ${(follow - DRAG).toFixed(1)}px > 20px（拖 ${DRAG} 走了 ${follow.toFixed(1)}）`)

    // ② 松手后要滑出去，不能一撒手就钉住
    await page.mouse.up()
    const vUp = (await read()).v
    await page.mouse.move(box.x + box.w / 2, 6) // 挪开，别让 hover 压住巡航
    await page.waitForTimeout(600)
    const glide = (await read()).x - s1.x
    if (glide > -40) probs.push(`松手后只滑了 ${glide.toFixed(1)}px，没有动量（松手速度 ${vUp.toFixed(2)}）`)

    // ③ 静置之后自己接回巡航。鼠标点过一下轨道会 focusin，
    //    如果那里没区分键盘焦点，这一条就会挂 —— 正是它抓出来的 bug。
    await page.waitForTimeout(2200)
    const a = await read()
    await page.waitForTimeout(700)
    const b = await read()
    if (b.v > -0.2) probs.push(`静置后没接回巡航：v=${b.v.toFixed(3)}（应 ≤ -0.2）`)
    if (b.x - a.x > -8) probs.push(`静置后轨道没继续走：700ms 只移动 ${(b.x - a.x).toFixed(1)}px`)

    // ④ 键盘也要能推（拖拽不能是唯一入口）
    await page.evaluate(() => document.querySelector('.wtrack')?.focus())
    const k0 = await read()
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(450)
    const k1 = await read()
    if (k1.x - k0.x > -20) probs.push(`ArrowRight 推不动轨道：Δx=${(k1.x - k0.x).toFixed(1)}px`)

    detail =
      `跟手误差 ${(follow - DRAG).toFixed(1)}px（拖 ${DRAG}px）、松手速度 ${vUp.toFixed(2)} 滑行 ${glide.toFixed(0)}px、` +
      `静置 2.9s 后接回巡航 v=${b.v.toFixed(2)}、ArrowRight 推进 ${(k1.x - k0.x).toFixed(0)}px`
  }
  await ctx.close()
  probs.length ? fail('12', '作品轨道拖拽与惯性', probs.join('\n      ')) : pass('12', '作品轨道拖拽与惯性', detail)
}

await browser.close()

/* === 10. 滚动手感 ====================================================
   「滑动阻尼一塌糊涂」没法靠肉眼验收，所以逐帧记录位移，把手感拆成
   跟手 / 超调 / 停稳 / 平滑度 / 掉帧几个量（实现见 scroll-feel.mjs）。
   同时把 v3 的 duration 配置也跑一遍当基线，防止调参调出个比上一版还钝的结果。

   三条定标经验，都是踩出来的：

   a) 停稳判毫秒，不判帧。lenis 1.3 用帧率无关阻尼 damp(x,y,lerp*60,dt_s)，
      时间常数在秒域，所以毫秒才是跨机器不变量。早先换算成「帧」再判，
      60fps 下 834ms 会被算成 50 帧而误判失败。

   b) 平滑度判 jerkRatio（幅度型），flipRate（计数型）只记录不卡。
      稳态窗口只有约 30 帧、过门限的样本更少，flipRate 实测随 lerp 无规律
      跳变（0 / 0.5 / 0.5 / 0.333 / 0.545），统计上撑不住一个硬门槛。

   c) jerk 要跟「输入自己的 jerk」比。同一条录像里 tg 是未平滑的原始输入，
      它自带 rAF 计时噪声；只有输出明显放大了输入，才算站点在抖。 */
{
  const { measure, LAUNCH_ARGS } = await import('./scroll-feel.mjs')
  const b = await chromium.launch({ args: LAUNCH_ARGS })
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } })
  const now = await measure(page, URL_BASE)
  const v3 = await measure(page, URL_BASE + (URL_BASE.includes('?') ? '&' : '?') + 'scroll=duration')
  await b.close()

  const probs = []
  let line = ''
  if (now.error || v3.error) {
    probs.push(`采样失败：${now.error || v3.error}（${now.frames ?? v3.frames} 帧）`)
  } else {
    const jerkCap = Math.max(0.12, now.inJerkRatio * 2.5)
    if (now.overshootPct > 2) probs.push(`超调 ${now.overshootPct}% > 2%（回弹了）`)
    if (now.settleMs < 0) probs.push('静置段没测到停稳点')
    if (now.settleMs > 1200) probs.push(`停稳 ${now.settleMs}ms > 1200ms（尾巴太长）`)
    if (now.settleMs > v3.settleMs * 1.1)
      probs.push(`停稳 ${now.settleMs}ms 比 v3 基线 ${v3.settleMs}ms 还拖`)
    if (now.lagPx > v3.lagPx * 1.15) probs.push(`跟手 ${now.lagPx}px 比 v3 基线 ${v3.lagPx}px 还钝`)
    if (now.jerkRatio > jerkCap)
      probs.push(`速度 jerk ${now.jerkRatio} > ${jerkCap.toFixed(3)}（输入自带 ${now.inJerkRatio}）`)
    if (now.worstDropRun >= 3) probs.push(`连续掉帧 ${now.worstDropRun} 帧 ≥ 3`)
    if (now.medianDt > now.baseDt * 1.35)
      probs.push(`滚动时 ${now.medianDt}ms/帧，比空转基线 ${now.baseDt}ms 贵 35% 以上`)
    if (now.svEnd > 0.01) probs.push(`速度总线没归零：收尾 ${now.svEnd}`)
    line =
      `本机 ${now.medianDt}ms/帧（空转基线 ${now.baseDt}ms）· 跟手 ${now.lagPx}px · 超调 ${now.overshootPct}% · ` +
      `停稳 ${now.settleMs}ms · jerk ${now.jerkRatio}（输入 ${now.inJerkRatio}，上限 ${jerkCap.toFixed(3)}）· ` +
      `掉帧连跑 ${now.worstDropRun} · 速度总线峰值 ${now.svPeak} 收尾 ${now.svEnd}\n      ` +
      `v3 基线（?scroll=duration）跟手 ${v3.lagPx}px · 停稳 ${v3.settleMs}ms · jerk ${v3.jerkRatio}\n      ` +
      `抖动率仅记录：本版 ${now.flipRate} / v3 ${v3.flipRate}（计数型，样本少，不作门槛）`
  }
  probs.length ? fail('10', '滚动手感', `${line}\n      未达标: ${probs.join('; ')}`) : pass('10', '滚动手感', line)
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
  // 两轮：
  //  · 默认轮走能力分级挡下 3D 之后的真实页面（绝大多数访客拿到的就是这一版），
  //    硬门槛照 v3 的成绩守住，3D 不能成为性能倒退的借口；
  //  · force3d 轮把 three 真的加载起来跑一遍，确认最重的那条路径也不塌，
  //    只卡一个下限 + CLS，不拿它当主指标（沙箱是软件光栅，本来就偏悲观）。
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
    'desktop+3d': {
      ...DESKTOP,
      url: URL_BASE + (URL_BASE.includes('?') ? '&' : '?') + 'force3d=1',
      minPerf: 85,
      hard: false,
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
      hard: p.hard,
    }
  }
  await chrome.kill()
  await writeFile('/workspace/lighthouse.json', JSON.stringify(lhOut, null, 2))
  const probs = []
  for (const [name, v] of Object.entries(lhOut)) {
    // CLS 和 Perf 下限两轮都要守：3D 是 fixed canvas，本来就不该推动任何东西
    if (v.cls > 0) probs.push(`${name} CLS ${v.cls} > 0`)
    if (v.perf < v.minPerf) probs.push(`${name} Perf ${v.perf} < ${v.minPerf}`)
    if (!v.hard) continue
    if (v.a11y < 96) probs.push(`${name} A11y ${v.a11y} < 96 (${v.a11yFails.join(',') || '-'})`)
    if (v.bp < 100) probs.push(`${name} BP ${v.bp} < 100`)
    if (v.seo < 92) probs.push(`${name} SEO ${v.seo} < 92`)
    if (v.lcp >= 2.5) probs.push(`${name} LCP ${v.lcp}s ≥ 2.5`)
    if (v.tbt > 150) probs.push(`${name} TBT ${v.tbt}ms > 150`)
  }
  const line = Object.entries(lhOut)
    .map(
      ([n, v]) =>
        `${n.padEnd(11)} Perf ${String(v.perf).padStart(3)} / A11y ${v.a11y} / BP ${v.bp} / SEO ${v.seo} · LCP ${v.lcp}s · CLS ${v.cls} · TBT ${v.tbt}ms${v.hard ? '' : ' (仅记录)'}`
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

results.sort((a, b) => Number(a.id) - Number(b.id)) // 字符串排序会把 '10' 排到 '2' 前面
console.log('\n──────────── 验收结果 ────────────')
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id}. ${r.name}\n      ${r.detail}`)
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} 通过`)
await writeFile('/workspace/audit.json', JSON.stringify({ results, contrastReport }, null, 2))
process.exit(failed.length ? 1 : 0)
