/**
 * 动效编排。
 *
 * 三条纪律：
 *  1) 默认状态永远是「已经可见」。只有挂上 .js 之后才允许把元素藏起来，
 *     所以禁用 JS、减弱动效、预渲染快照三种情况下内容都是完整的。
 *  2) 不写 window.addEventListener('scroll')。滚动位置只有两个读法：
 *     ScrollTrigger，或者一个 rAF 循环。
 *  3) 每个 ScrollTrigger 都装在 gsap.context() 里，且**按区块懒建**：
 *     区块进入视口前 1.5 屏才建，离开 2 屏后 revert()。首屏因此只建两章，
 *     这是移动端 TBT 的主要来源。
 */

import { useEffect, useRef, useState, type RefObject } from 'react'
import { setPointer } from './bus'
import { prefersReducedMotion } from './caps'

/* ------------------------------------------------------------ 平滑滚动 */

let lenisRef: { destroy: () => void; raf: (t: number) => void } | null = null

export async function bootScroll() {
  if (typeof window === 'undefined' || prefersReducedMotion()) return () => {}
  const { default: Lenis } = await import('lenis')
  const lenis = new Lenis({
    duration: 1.05,
    // 指数缓出：起步快、收尾慢，手感接近真的在拉一条有阻尼的绳子
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

  // lenis 接管之后，ScrollTrigger 必须被告知「滚动位置由谁说了算」，
  // 否则 pin 与 scrub 会比页面慢半拍。
  const { ScrollTrigger } = await import('gsap/ScrollTrigger')
  lenis.on('scroll', () => ScrollTrigger.update())

  return () => {
    cancelAnimationFrame(raf)
    lenis.destroy()
    lenisRef = null
  }
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
export function useReveal<T extends Element>(rootMargin = '-12% 0px -8% 0px') {
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

/* ------------------------------------------------------------ 手感 */

/**
 * 磁吸。指针靠近时元素朝指针方向偏一点，离开就回位。
 *
 * 幅度只有几个像素，但它把「静态的一块」变成「会回应你的一块」。
 * 关键是**不要跟得太紧**：位移取指针到中心距离的一个小比例，并且
 * 出了元素范围就立刻归零 —— 跟太紧会变成粘手，读者反而想躲。
 *
 * 只在有精确指针的设备上挂（触屏没有 hover 这个状态），
 * 减弱动效时整个不挂。
 */
export function useMagnet<T extends HTMLElement>(strength = 6) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
      el.style.setProperty('--mx', `${(dx * strength).toFixed(2)}px`)
      el.style.setProperty('--my', `${(dy * strength).toFixed(2)}px`)
    }
    const leave = () => {
      el.style.setProperty('--mx', '0px')
      el.style.setProperty('--my', '0px')
    }

    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      leave()
    }
  }, [strength])
  return ref as RefObject<T>
}

/**
 * 指针微倾。把指针在元素内的相对位置写成 --px / --py（-1 ~ 1），
 * 具体转成什么角度交给 CSS —— 这样同一个钩子既能做卡片倾斜，也能做别的。
 * 松开/离开时回零，回零的过渡也在 CSS 里。
 */
export function useTilt<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  // 返回可写的 ref：调用方常常要把同一个节点同时交给别的 ref（叠卡就是这样），
  // 所以这里不收窄成 RefObject。
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const px = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
      const py = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
      el.style.setProperty('--px', Math.max(-1, Math.min(1, px)).toFixed(3))
      el.style.setProperty('--py', Math.max(-1, Math.min(1, py)).toFixed(3))
    }
    const reset = () => {
      el.style.setProperty('--px', '0')
      el.style.setProperty('--py', '0')
    }

    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', reset)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', reset)
      reset()
    }
  }, [])
  return ref
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
    const timers: number[] = []
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          kids.forEach((k, i) => timers.push(window.setTimeout(() => k.classList.add('is-in'), i * step)))
          io.disconnect()
        }
      },
      { rootMargin: '-10% 0px', threshold: 0.01 },
    )
    io.observe(el)
    return () => {
      timers.forEach(clearTimeout)
      io.disconnect()
    }
  }, [step])
  return ref as RefObject<T>
}

/**
 * 当前章。顶栏靠它把「读者现在在哪一章」显示出来。
 *
 * rootMargin 上下各收 -45%，观察窗于是压成视口中间那一条窄带：
 * 同一时刻只有跨过视口中线的那一章在相交，谁是「当前」就没有歧义，
 * 也不需要读 scrollY 或者比较各章的可见面积。
 *
 * 返回 null 表示还没有任何一章跨过中线（页面刚打开、或者停在页脚）。
 */
export function useActiveSection(ids: string[]) {
  const key = ids.join(',')
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const els = key
      .split(',')
      .map((id) => document.getElementById(id))
      .filter((e): e is HTMLElement => Boolean(e))
    if (!els.length || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [key])
  return active
}

/* ------------------------------------------------------------ 懒建 trigger */

type Ctx = { revert: () => void }

/**
 * 交给 build 回调的东西。组件侧用它给 useCallback 标类型——不导出这个别名的话，
 * 每个用到懒建的组件都要重抄一遍 `typeof import('gsap')`。
 */
export type SceneApi = {
  gsap: typeof import('gsap').gsap
  ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger
  root: HTMLElement
}

/**
 * 区块级懒装配。进入视口前 1.5 屏才 import gsap 并建 trigger，
 * 离开 2 屏后 revert()。首屏因此不为下面六章付任何解析与建表成本。
 *
 * build 拿到的是一个已经 registerPlugin 过的 gsap 与 ScrollTrigger，
 * 返回值交给 gsap.context() 管理，卸载时一次性回收。
 */
/**
 * 媒体查询开关。SSR 与首帧一律 false —— 预渲染快照里不该出现任何只有宽屏才成立
 * 的接管态；水合之后再按真实视口切。用它给「只在宽屏才建的场景」把门。
 */
export function useMediaQuery(query: string) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const sync = () => setOn(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [query])
  return on
}

export function useLazyScene(
  ref: RefObject<HTMLElement | null>,
  /**
   * 返回值会被 gsap.context 当作卸载钩子调用。凡是 build 里手写过的内联样式
   * 与 classList，都必须在这里还原 —— context.revert() 只认它自己 tween 过的属性，
   * 手写的 `el.style.height` 它一概不管，v8 的移动端空白就是这么来的。
   */
  build: (api: SceneApi) => void | (() => void),
  enabled = true,
) {
  useEffect(() => {
    const root = ref.current
    if (!root || !enabled) return
    if (typeof window === 'undefined' || prefersReducedMotion()) return

    let ctx: Ctx | null = null
    let dead = false

    const mount = async () => {
      if (ctx || dead) return
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])
      if (dead) return
      gsap.registerPlugin(ScrollTrigger)
      ctx = gsap.context(() => build({ gsap, ScrollTrigger, root }), root)
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) mount()
      },
      { rootMargin: '150% 0px 150% 0px' },
    )
    io.observe(root)

    return () => {
      dead = true
      io.disconnect()
      ctx?.revert()
      ctx = null
    }
  }, [ref, build, enabled])
}

/* ------------------------------------------------------------ 案例叠层 */

/**
 * 案例卡叠层。sticky 定位在 CSS 里（等价于 pin + pinSpacing:false，
 * 但不需要 pin-spacer，也就不会和 lenis 打架）；这里只做被压住那张的形变：
 * 后一张推上来时，前一张缩一点、沉一点。
 *
 * 退场用的是「沉降遮片」而不是 opacity：opacity 会让上一张卡透过下一张卡
 * 显形，filter: brightness() 在饱和底色上会把纸压成脏黑，等于偷偷做了个
 * 深色模式。--sink 盖的是本章底色，读起来是卡片沉回背景里。
 */
export function caseStack(
  ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger,
  root: HTMLElement,
  cards: HTMLElement[],
) {
  const stick: number[] = []
  cards.forEach((c, i) => {
    c.style.zIndex = String(i + 1)
    c.style.setProperty('--sink', '0')
    c.style.setProperty('--shrink', '1')
    stick.push(parseFloat(getComputedStyle(c).insetBlockStart) || 0)
  })

  // 不写「以下一张卡为 trigger」：那些卡是 sticky 的。场景要是在页面已经滚进本章
  // 之后才建起来（点锚点直达、深链回来、前进后退），ScrollTrigger 量到的是它被钉住
  // 之后的位置，start/end 整体偏掉，结果是卡片还整个露着就被漂白，看着像禁用态。
  // 改成每次滚动现量「下一张压过来多少」，几何永远是当下的真值。
  const apply = () => {
    const reach = window.innerHeight * 0.6
    for (let i = 0; i < cards.length - 1; i++) {
      const span = Math.max(1, reach - stick[i + 1])
      const t = cards[i + 1].getBoundingClientRect().top
      const p = Math.min(1, Math.max(0, (reach - t) / span))
      cards[i].style.setProperty('--sink', (p * 0.45).toFixed(4))
      cards[i].style.setProperty('--shrink', (1 - p * 0.06).toFixed(4))
    }
  }

  ScrollTrigger.create({
    trigger: root,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: apply,
    onRefresh: apply,
  })
  apply()
}

/* ------------------------------------------------------------ 作品横推 */

/**
 * 横向推进。跑道（rail）的高度就是行程：一屏 + 需要横移的距离。
 * sticky 把内容钉在视口，scrub 把 x 从 0 拉到 -distance。
 * invalidateOnRefresh 让缩放窗口后距离重算，不会推过头或推不到底。
 */
export function worksPan(
  gsap: typeof import('gsap').gsap,
  rail: HTMLElement,
  track: HTMLElement,
) {
  // scrollWidth 不含溢出内容那一侧的内距——Chrome 在子元素溢出时会把容器的
  // padding-inline-end 丢掉。照它算出来的行程走完，末卡右缘离视口只剩 8px，
  // 而开头有整整一个 --gutter 的留白，两头不对称。手动把右内距补回去。
  const distance = () => {
    const pad = parseFloat(getComputedStyle(track).paddingInlineEnd) || 0
    return Math.max(0, track.scrollWidth + pad - window.innerWidth)
  }
  const size = () => {
    rail.style.height = window.innerHeight + distance() + 'px'
  }
  size()
  gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: rail,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      invalidateOnRefresh: true,
      onRefreshInit: size,
    },
  })

  /**
   * 卸载钩子。上面那句 `rail.style.height = ...` 是手写的内联样式，
   * gsap 的 context.revert() 不会碰它 —— 这正是 v8 移动端「空白占满一页」的成因：
   * 视口一旦宽过断点（手机横屏就够了）跑道被钉成两千多像素高，
   * 转回竖屏时 CSS 已经切成竖排，那句内联高度却还在，于是留下一大截死白。
   * 这里连同 pan 态的 class 一起还原。
   */
  return () => {
    rail.style.removeProperty('height')
    track.style.removeProperty('transform')
    track.classList.remove('is-pan')
  }
}
