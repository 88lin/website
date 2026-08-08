import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const isTouch = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches

export const isNarrow = () => typeof window !== 'undefined' && window.innerWidth < 768

export { gsap, ScrollTrigger }

/** 标题逐行上推。reduced motion 下直接呈现终态。 */
export function revealLines(scope: HTMLElement, selector = '.reveal-line > span', delay = 0) {
  const nodes = scope.querySelectorAll(selector)
  if (prefersReduced()) {
    gsap.set(nodes, { yPercent: 0, opacity: 1 })
    return
  }
  gsap.from(nodes, {
    yPercent: 116,
    duration: 1.05,
    ease: 'expo.out',
    stagger: 0.075,
    delay,
    scrollTrigger: { trigger: scope, start: 'top 82%' },
  })
}

/** 通用淡入上移。 */
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

/** 数字滚动到真实值。 */
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
