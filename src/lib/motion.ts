import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const isTouch = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches

export const isNarrow = () => typeof window !== 'undefined' && window.innerWidth < 768

export { gsap, ScrollTrigger }

/* ══════════════════════════════════════════════════════════
   滚动速度总线
   Lenis 只负责移动视口。这条总线让页面对「滚动速度」本身做出
   反应，是 V3 缺失的那份重量感的来源。
   --sv ∈ [-1, 1]，向下滚为正，经指数平滑，停手后自然衰减到 0。
   ══════════════════════════════════════════════════════════ */

type SVListener = (v: number) => void

const svListeners = new Set<SVListener>()
let svRaw = 0
let sv = 0
let svEnabled = false

/** Lenis 的 velocity 约为 px/frame；55 是实测的「快速滚动」量级。 */
export function pushVelocity(v: number) {
  svRaw = Math.max(-1, Math.min(1, v / 55))
}

/** 每帧调用：平滑 + 自衰减 + 广播。 */
export function tickVelocity() {
  if (!svEnabled) return
  svRaw *= 0.86
  sv += (svRaw - sv) * 0.12
  if (Math.abs(sv) < 0.0008) sv = 0
  // 这里曾经每帧往 :root 写一个 --sv 自定义属性。实测代价 42ms/帧（关掉后 1.8ms）：
  // 改根节点的行内样式会让整棵树的继承自定义属性失效，而全站根本没有一条 CSS 读它 ——
  // 纯粹是白烧一整帧。速度总线改成只走 JS 订阅，要做 CSS 联动时再单独挂到局部节点上。
  ;(window as unknown as { __sv: number }).__sv = sv
  for (const fn of svListeners) fn(sv)
}

export function enableVelocityBus(on: boolean) {
  svEnabled = on
  if (!on) {
    svRaw = 0
    sv = 0
    if (typeof window !== 'undefined') (window as unknown as { __sv: number }).__sv = 0
    if (typeof document !== 'undefined') document.documentElement.style.removeProperty('--sv')
  }
}

export function onVelocity(fn: SVListener) {
  svListeners.add(fn)
  return () => {
    svListeners.delete(fn)
  }
}

export const getVelocity = () => sv

/* ══════════════════════════════════════════════════════════
   入场语言
   V3 全站只有一个 fadeUp，所以每个区块的出场都一样。
   下面每个函数对应一类内容，让不同的东西用不同的方式到场。
   ══════════════════════════════════════════════════════════ */

/** 通用淡入上移。保留给次要元素与降级路径。 */
export function fadeUp(targets: gsap.DOMTarget, trigger: HTMLElement, stagger = 0.06, y = 26) {
  if (prefersReduced()) {
    gsap.set(targets, { opacity: 1, y: 0 })
    return
  }
  gsap.fromTo(
    targets,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration: 0.85,
      ease: 'power3.out',
      stagger,
      scrollTrigger: { trigger, start: 'top 80%' },
    }
  )
}

/**
 * 大标题逐行上推。V2 的做法，V3 删掉了，现在拿回来。
 * 结构约定：`.reveal-line { overflow: hidden }`，内含一个 `> span`。
 * 注意 overflow:hidden 会裁掉荧光笔渐变的底边，带 .marker 的标题请改用 revealChars。
 */
export function revealLines(root: HTMLElement, stagger = 0.075, sel = '.reveal-line > span') {
  const spans = root.querySelectorAll<HTMLElement>(sel)
  if (!spans.length) return
  if (prefersReduced()) {
    gsap.set(spans, { yPercent: 0, opacity: 1 })
    return
  }
  gsap.fromTo(
    spans,
    { yPercent: 116 },
    {
      yPercent: 0,
      duration: 1.05,
      ease: 'expo.out',
      stagger,
      scrollTrigger: { trigger: root, start: 'top 82%' },
    }
  )
}

/* ---- 逐字切分：CJK 按字，拉丁按词 ---- */

const LATIN_RUN = /[A-Za-z0-9@._'&/+\-–]/

function tokenize(s: string): string[] {
  const out: string[] = []
  let buf = ''
  for (const ch of s) {
    if (LATIN_RUN.test(ch)) {
      buf += ch
    } else {
      if (buf) {
        out.push(buf)
        buf = ''
      }
      out.push(ch)
    }
  }
  if (buf) out.push(buf)
  return out
}

function splitTextNodes(node: Node, sink: HTMLElement[]) {
  const kids = Array.from(node.childNodes)
  for (const kid of kids) {
    if (kid.nodeType === Node.TEXT_NODE) {
      const text = kid.nodeValue ?? ''
      if (!text.trim()) continue
      const frag = document.createDocumentFragment()
      for (const tok of tokenize(text)) {
        if (!tok.trim()) {
          frag.appendChild(document.createTextNode(tok))
          continue
        }
        const s = document.createElement('span')
        s.className = 'rc'
        s.textContent = tok
        frag.appendChild(s)
        sink.push(s)
      }
      node.replaceChild(frag, kid)
    } else if (kid.nodeType === Node.ELEMENT_NODE) {
      splitTextNodes(kid, sink)
    }
  }
}

/**
 * 主标题按字/词交错到场。
 * 切分会把文本节点换成 inline-block，理论上可能改变换行位置从而引入 CLS。
 * 这里带一个测量护栏：切分前后高度不一致就整体回滚，退回 fadeUp。
 * CLS 严格为 0 是本轮的硬门槛，不拿它换效果。
 */
export function revealChars(el: HTMLElement, stagger = 0.028, trigger?: HTMLElement) {
  if (!el || el.dataset.split === 'done') return
  const before = el.getBoundingClientRect().height
  const html = el.innerHTML
  const spans: HTMLElement[] = []
  splitTextNodes(el, spans)
  if (!spans.length) return

  const after = el.getBoundingClientRect().height
  if (Math.abs(after - before) > 0.5) {
    // 切分改变了换行 —— 回滚，宁可少一层效果也不要布局跳动
    el.innerHTML = html
    fadeUp(el, trigger ?? el, 0, 22)
    return
  }
  el.dataset.split = 'done'

  if (prefersReduced()) {
    gsap.set(spans, { opacity: 1, y: 0 })
    return
  }
  gsap.fromTo(
    spans,
    { opacity: 0, y: '0.5em' },
    {
      opacity: 1,
      y: '0em',
      duration: 0.82,
      ease: 'power3.out',
      stagger,
      scrollTrigger: { trigger: trigger ?? el, start: 'top 86%' },
    }
  )
}

/** 图片/封面用揭幕，不用淡入。'l' 从左揭开、'r' 从右揭开、'b' 自下而上。 */
export function revealMask(
  targets: gsap.DOMTarget,
  trigger: HTMLElement,
  dir: 'l' | 'r' | 'b' = 'l',
  stagger = 0.1
) {
  const from =
    dir === 'l'
      ? 'inset(0% 100% 0% 0%)'
      : dir === 'r'
        ? 'inset(0% 0% 0% 100%)'
        : 'inset(100% 0% 0% 0%)'
  if (prefersReduced()) {
    gsap.set(targets, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 })
    return
  }
  gsap.fromTo(
    targets,
    { clipPath: from, opacity: 1 },
    {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 0.95,
      ease: 'power2.inOut',
      stagger,
      scrollTrigger: { trigger, start: 'top 84%' },
    }
  )
}

/**
 * 数字跟着滚动进度走 —— 滚到一半数字就停在一半。
 * 这是「滚动确实在驱动页面」最直接的一处反馈。
 */
export function countScrub(el: HTMLElement, raw: string) {
  const numeric = Number(raw.replace(/[^\d.]/g, ''))
  if (!Number.isFinite(numeric) || numeric === 0 || prefersReduced()) {
    el.textContent = raw
    return
  }
  const suffix = raw.replace(/[\d.,]/g, '')
  const obj = { v: 0 }
  gsap.to(obj, {
    v: numeric,
    ease: 'none',
    scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 52%', scrub: 0.6 },
    onUpdate() {
      el.textContent = Math.round(obj.v).toLocaleString('en-US') + suffix
    },
  })
}

/** 兼容保留：非 scrub 的数字滚动。 */
export function countUp(el: HTMLElement, raw: string) {
  const numeric = Number(raw.replace(/[^\d.]/g, ''))
  if (!Number.isFinite(numeric) || numeric === 0 || prefersReduced()) {
    el.textContent = raw
    return
  }
  const suffix = raw.replace(/[\d.,]/g, '')
  const obj = { v: 0 }
  gsap.to(obj, {
    v: numeric,
    duration: 1.6,
    ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 88%' },
    onUpdate() {
      el.textContent = Math.round(obj.v).toLocaleString('en-US') + suffix
    },
    onComplete() {
      el.textContent = raw
    },
  })
}

/** 层次位移。目标元素上写 data-depth（-1 ~ 1），负值走得比页面慢。 */
export function parallax(targets: gsap.DOMTarget, trigger: HTMLElement, amount = 8) {
  if (prefersReduced()) return
  const els = gsap.utils.toArray<HTMLElement>(targets)
  for (const el of els) {
    const depth = Number(el.dataset.depth ?? '0.4')
    gsap.fromTo(
      el,
      { yPercent: amount * depth },
      {
        yPercent: -amount * depth,
        ease: 'none',
        scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
      }
    )
  }
}

/**
 * 从中心向外辐射的弹入。用于标签云——按到几何中心的距离排序 stagger，
 * 整片云是「涨」出来的，不是从上到下刷出来的。
 */
export function radialPop(container: HTMLElement, sel: string, stagger = 0.012) {
  const els = Array.from(container.querySelectorAll<HTMLElement>(sel))
  if (!els.length) return
  if (prefersReduced()) {
    gsap.set(els, { opacity: 1, scale: 1 })
    return
  }
  const box = container.getBoundingClientRect()
  const cx = box.left + box.width / 2
  const cy = box.top + box.height / 2
  const ordered = els
    .map((el) => {
      const r = el.getBoundingClientRect()
      return { el, d: Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy) }
    })
    .sort((a, b) => a.d - b.d)
    .map((o) => o.el)

  gsap.fromTo(
    ordered,
    { opacity: 0, scale: 0.82 },
    {
      opacity: 1,
      scale: 1,
      duration: 0.62,
      ease: 'back.out(1.4)',
      stagger,
      scrollTrigger: { trigger: container, start: 'top 86%' },
    }
  )
}

/**
 * 长索引的行入场。从左边刷出来，像一行行被打印出去，不是浮上来。
 * 一条时间线一个 trigger，55 行不会串成一条几十秒的长队。
 */
export function revealRows(targets: gsap.DOMTarget, trigger: HTMLElement, stagger = 0.028) {
  if (prefersReduced()) {
    gsap.set(targets, { opacity: 1, x: 0 })
    return
  }
  gsap.fromTo(
    targets,
    { opacity: 0, x: -12 },
    {
      opacity: 1,
      x: 0,
      duration: 0.35,
      ease: 'power2.out',
      stagger,
      scrollTrigger: { trigger, start: 'top 88%' },
    }
  )
}

/**
 * 重力坠落。power2.in 是加速曲线——东西是掉下来的，不是浮上来的；
 * 全站只有活字块用它，因为只有它是「实物」。
 */
export function dropIn(targets: gsap.DOMTarget, trigger: HTMLElement, stagger = 0.075) {
  if (prefersReduced()) {
    gsap.set(targets, { opacity: 1, yPercent: 0 })
    return
  }
  gsap.fromTo(
    targets,
    { opacity: 0, yPercent: -170 },
    {
      opacity: 1,
      yPercent: 0,
      duration: 0.5,
      ease: 'power2.in',
      stagger,
      scrollTrigger: { trigger, start: 'top 82%' },
    }
  )
}

/**
 * 基准线上的滚动进度高亮段。
 * reduced-motion 下直接不出现（CSS 默认 scaleY(0)）——一个纯粹由滚动驱动的
 * 指示器，在关掉动效时应该消失，而不是钉死在 100%。
 */
export function railProgress(rail: HTMLElement, section: HTMLElement) {
  if (prefersReduced()) return
  gsap.fromTo(
    rail,
    { scaleY: 0 },
    {
      scaleY: 1,
      ease: 'none',
      transformOrigin: 'top',
      scrollTrigger: { trigger: section, start: 'top 70%', end: 'bottom 70%', scrub: 0.5 },
    }
  )
}
