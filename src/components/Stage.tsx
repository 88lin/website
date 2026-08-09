/**
 * 实时机架的挂载点。整站唯一创建 WebGL 上下文的地方。
 *
 * 三条硬规矩：
 *  1. 服务端与首帧一律渲染 null。预渲染出来的 HTML 里不该有空画布，
 *     否则水合时 React 会拿真实 DOM 跟一个「还没决定要不要画布」的树对账。
 *  2. 点火要晚。首屏的字与版面先落地，约 420ms 之后再动态 import 三个
 *     WebGL 模块——这样 LCP 不跟 500KB 的 three 抢主线程，也就不需要加载页。
 *  3. 点着了才给 <html> 加 .gl-on。加上之后窗口里的静态图版让位给画布；
 *     点不着（老显卡、context 创建失败、模块加载失败）就保持图版，
 *     版面一模一样，只是不会动——这是降级，不是坏掉。
 */

import { useEffect, useRef, useState } from 'react'
import { detectTier, type Tier } from '../lib/caps'
import type { RackHandle } from '../webgl/Rack'

const IGNITE_DELAY = 420

export function Stage() {
  const [tier, setTier] = useState<Tier>('static')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // 能力探测放在 effect 里：SSR 与首帧都得是 static，第二帧才可能升档。
  useEffect(() => setTier(detectTier()), [])

  useEffect(() => {
    if (tier === 'static') return
    let handle: RackHandle | null = null
    let cancelled = false

    const timer = window.setTimeout(() => {
      const canvas = canvasRef.current
      if (!canvas || cancelled) return
      import('../webgl/Rack')
        .then(({ mountRack }) => {
          if (cancelled) return
          handle = mountRack(canvas, tier)
          if (handle) document.documentElement.classList.add('gl-on')
        })
        .catch(() => {
          /* 加载不到就留在图版上，不打断阅读 */
        })
    }, IGNITE_DELAY)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      handle?.dispose()
      document.documentElement.classList.remove('gl-on')
    }
  }, [tier])

  if (tier === 'static') return null

  return (
    <div className="stage" aria-hidden>
      <canvas ref={canvasRef} />
    </div>
  )
}
