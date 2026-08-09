/**
 * 设备能力门禁。整站只有这一处决定「跑不跑实时 3D」。
 *
 * 明确的产品决定：手机不跑 WebGL，改用构建期从同一个真实场景截出来的
 * 静态图版。手机上的实时渲染要么烫手要么掉帧，两种都比一张好图版差。
 * 留了一个 `?gl=1` 的口子，将来想在高端手机上放开只改这里。
 */

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

/**
 * 返回这台机器该跑哪一档。
 *  high   — 65,536 粒子（256²）、色散折射全开、dpr ≤ 1.75
 *  mid    — 16,384 粒子（128²）、折射降采样、dpr ≤ 1.25
 *  static — 不创建 canvas，用图版
 */
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
