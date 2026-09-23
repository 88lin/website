/** 能力探测：减弱动效、精确指针、WebGL 之类。 */

export type Tier = 'high' | 'mid' | 'static'

const isSSR = typeof window === 'undefined'

export const prefersReducedMotion = () =>
  !isSSR && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const isCoarse = () => !isSSR && window.matchMedia('(pointer: coarse)').matches

export const forceGL = () => !isSSR && new URLSearchParams(window.location.search).has('gl')

const hasWebGL2 = () => {
  if (isSSR) return false
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
  } catch {
    return false
  }
}

/* 返回这台机器该跑哪一档。 */
export const detectTier = (): Tier => {
  if (isSSR) return 'static'
  if (prefersReducedMotion()) return 'static'
  if (forceGL()) return 'high'

  const narrow = window.matchMedia('(max-width: 900px)').matches
  if (narrow || isCoarse()) return 'static'
  if (!hasWebGL2()) return 'static'

  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const cores = navigator.hardwareConcurrency || 4
  if ((mem !== undefined && mem <= 4) || cores <= 4) return 'mid'
  return 'high'
}

export const dprCap = (tier: Tier) => (tier === 'high' ? 1.75 : 1.25)
export const particleSide = (tier: Tier) => (tier === 'high' ? 96 : 64)
