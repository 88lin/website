/**
 * 3D 活字系统的准入门禁。
 *
 * 判断放在加载 three 之前——不合格的设备根本不会下载那 100 多 KB，
 * 它们拿到的是 DOM 活字方阵（.type-matrix）。那一层不是降级截图，
 * 它本身就是设计的一部分，所以「不加载 3D」不等于「少了什么」。
 */
export type CapsVerdict = { ok: boolean; reason: string }

export function typeCaps(): CapsVerdict {
  if (typeof window === 'undefined') return { ok: false, reason: 'ssr' }

  /**
   * 审计用的正向探针：只放行「软件渲染器」和「内存不足」这两条性能判据，
   * 无头 Chromium 只有 SwiftShader，不开这个口子就永远测不到 3D 真跑起来的样子。
   * 可访问性判据（reduced-motion / 触屏 / 窄屏）无论如何都不放行。
   */
  const forced = /(?:^|[?&])force3d=1(?:&|$)/.test(window.location.search)

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return { ok: false, reason: 'reduced-motion' }

  // 移动端一律不加载：守住移动 Perf / LCP 基线，也避免触屏上的指针视差没有意义
  if (window.matchMedia('(pointer: coarse)').matches) return { ok: false, reason: 'coarse-pointer' }
  if (window.innerWidth < 900) return { ok: false, reason: `narrow:${window.innerWidth}` }

  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (!forced && typeof mem === 'number' && mem > 0 && mem < 4)
    return { ok: false, reason: `memory:${mem}` }

  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null
  try {
    const probe = document.createElement('canvas')
    gl = (probe.getContext('webgl2') ||
      probe.getContext('webgl')) as WebGL2RenderingContext | null
  } catch {
    return { ok: false, reason: 'webgl-throw' }
  }
  if (!gl) return { ok: false, reason: 'no-webgl' }

  let renderer = ''
  try {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    if (dbg) renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '')
  } catch {
    /* 拿不到就按未知处理，下面的软件渲染判据自然不命中 */
  }
  try {
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    /* 探测用的上下文，回收失败不影响主流程 */
  }

  // 软件渲染器跑 3D 只会把帧率拖到个位数，不如不跑
  if (!forced && /swiftshader|llvmpipe|softwar|basic render|angle \(software/i.test(renderer))
    return { ok: false, reason: `software:${renderer.slice(0, 40)}` }

  return { ok: true, reason: renderer.slice(0, 60) || 'webgl' }
}
