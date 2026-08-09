/**
 * 动效编排。
 *
 * 全站只有一个「被编排出来的时刻」——继电器切换：
 *   灯先亮 → 3D 信号改道 → 该通道的标注层展开。
 * 其余入场只是把内容接上电，九格 bay 各用各的方式（快门、数位滚、
 * 拉线、滑轨、就位、级联、卡扣、指针扫、泛光），不是同一个淡入向上。
 *
 * 默认状态永远是「已经可见」。减弱动效时这里什么都不做，内容仍然完整。
 */

import { useEffect, useRef, type RefObject } from 'react'
import { setChannel, setScroll, setPointer, setAperture } from './bus'
import { prefersReducedMotion } from './caps'

/* ------------------------------------------------------------ 平滑滚动 */

let lenisRef: { destroy: () => void; raf: (t: number) => void } | null = null

export async function bootScroll() {
  if (typeof window === 'undefined' || prefersReducedMotion()) return () => {}
  const { default: Lenis } = await import('lenis')
  const lenis = new Lenis({
    duration: 1.05,
    // 指数缓出：起步快、收尾慢，手感接近真的在推一台有阻尼的滑轨
    easing: (t: number) => 1 - Math.pow(1 - t, 3.2),
    wheelMultiplier: 0.92,
    touchMultiplier: 1.4,
  })
  lenisRef = lenis as unknown as typeof lenisRef

  let raf = 0
  const loop = (t: number) => {
    lenis.raf(t)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  const doc = document.documentElement
  lenis.on('scroll', ({ velocity }: { velocity: number }) => {
    const max = Math.max(1, doc.scrollHeight - window.innerHeight)
    setScroll(window.scrollY / max, Math.max(-1, Math.min(1, velocity / 45)))
  })

  return () => {
    cancelAnimationFrame(raf)
    lenis.destroy()
    lenisRef = null
  }
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY
  const l = lenisRef as unknown as { scrollTo?: (t: number, o?: object) => void } | null
  if (l?.scrollTo) l.scrollTo(top, { duration: 1.1 })
  else window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

/* ------------------------------------------------------------ 指针 */

export function bootPointer() {
  if (typeof window === 'undefined') return () => {}
  const move = (e: PointerEvent) => {
    setPointer(
      (e.clientX / window.innerWidth) * 2 - 1,
      -((e.clientY / window.innerHeight) * 2 - 1),
      true,
    )
  }
  const leave = () => setPointer(0, 0, false)
  window.addEventListener('pointermove', move, { passive: true })
  window.addEventListener('pointerleave', leave)
  return () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerleave', leave)
  }
}

/* ------------------------------------------------------------ 入场 */

/** 单元素揭示：进入视口就加 .is-in，一次性，不来回抖。 */
export function useReveal<T extends HTMLElement>(rootMargin = '-12% 0px -8% 0px') {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      el.classList.add('is-in')
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin, threshold: 0.01 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])
  return ref as RefObject<T>
}

/** 子元素级联：给容器内所有 [data-stagger] 依次加 .is-in。 */
export function useStagger<T extends HTMLElement>(step = 55) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const kids = Array.from(el.querySelectorAll<HTMLElement>('[data-stagger]'))
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      kids.forEach((k) => k.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          kids.forEach((k, i) => window.setTimeout(() => k.classList.add('is-in'), i * step))
          io.disconnect()
        }
      },
      { rootMargin: '-10% 0px', threshold: 0.01 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [step])
  return ref as RefObject<T>
}

/* ------------------------------------------------------------ 通道跟踪 */

/**
 * 谁在视口中间，谁就是 live 通道。用 rAF 节流的 scroll 读取而不是
 * IntersectionObserver：需要的是「哪一格占住了中线」，不是「谁露出来了」。
 */
export function bootChannelTracking(ids: string[]) {
  if (typeof window === 'undefined') return () => {}
  const read = () => {
    const mid = window.innerHeight * 0.42
    let best = 0
    for (let i = 0; i < ids.length; i++) {
      const el = document.getElementById(ids[i])
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (r.top <= mid && r.bottom > mid) {
        best = i
        break
      }
      if (r.top <= mid) best = i
    }
    setChannel(best)

    // 顺手广播这一格的机身开口。量的是 DOM，播出去的是语义：
    // 「洞在视口的哪个位置、多大」。3D 层据此把透镜摆进洞里，不认识这个节点。
    const bez = document.getElementById(ids[best])?.querySelector('.chassis__bezel')
    if (!bez) {
      setAperture(null)
    } else {
      const b = bez.getBoundingClientRect()
      setAperture({
        x: ((b.left + b.width / 2) / window.innerWidth) * 2 - 1,
        y: 1 - ((b.top + b.height / 2) / window.innerHeight) * 2,
        w: (b.width / window.innerWidth) * 2,
        h: (b.height / window.innerHeight) * 2,
      })
    }
  }
  // 每帧读，而不是只在 scroll 时读。
  // 开口的位置不止被滚动改变——入场动画落位、sticky 叠层、字体换页、窗口缩放
  // 都会让那个洞挪地方，而它们一个 scroll 事件都不发。只听 scroll 的话，
  // 透镜会停在上一次滚动时算出的位置上，看起来就是「玻璃没对准窗口」。
  // 代价是每帧十来次 getBoundingClientRect，都是只读、同一批次，可以接受。
  let raf = 0
  const loop = () => {
    raf = requestAnimationFrame(loop)
    read()
  }
  read()
  raf = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(raf)
}

/* ------------------------------------------------------------ 案例叠层 */

/**
 * 案例卡叠层：后一张推上来时，前一张缩一点、淡一点。
 * sticky 定位在 CSS 里，这里只做被压住那张的形变。
 */
export async function bootCaseStack(cards: HTMLElement[]) {
  if (typeof window === 'undefined' || prefersReducedMotion() || cards.length < 2) return () => {}
  const { gsap } = await import('gsap')
  const { ScrollTrigger } = await import('gsap/ScrollTrigger')
  gsap.registerPlugin(ScrollTrigger)

  // 后面的卡永远盖住前面的卡：sticky 元素同处一个层叠上下文，只靠 DOM 顺序
  // 太脆——一旦有人给某张卡加了 transform 就会翻车。
  cards.forEach((c, i) => {
    c.style.zIndex = String(i + 1)
    // GSAP 读不到未声明的自定义属性，起始值必须显式落在 style 上
    c.style.setProperty('--sink', '0')
  })

  // 退场既不用 opacity 也不用 filter。opacity 会让上一张卡透过下一张卡显形；
  // filter: brightness() 在饱和色底上会把卡片压成脏黑，等于偷偷做了个深色模式。
  // 这里改成盖一层「机架底色」的veil：卡片是往机架里沉回去，不是被调暗。
  const tweens = cards.slice(0, -1).map((card, i) =>
    gsap.to(card, {
      scale: 0.945,
      '--sink': 0.62,
      ease: 'none',
      scrollTrigger: {
        trigger: cards[i + 1],
        start: 'top 88%',
        end: 'top 18%',
        scrub: true,
      },
    }),
  )
  return () => {
    tweens.forEach((t) => {
      t.scrollTrigger?.kill()
      t.kill()
    })
  }
}
