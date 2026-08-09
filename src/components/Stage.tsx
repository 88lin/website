/**
 * 舞台。整站唯一的 3D 容器，也是四个「敞开章」的真实底色来源。
 *
 * 三层，从下往上：
 *  1) .stage__wash  三块双色硬切场。敞开章不铺自己的底色，看到的就是这里。
 *  2) .stage__plate 静态图版。手机与不跑 WebGL 的机器看到的是同一条线，只是不动。
 *  3) canvas        实时织带。点着了就把图版淡掉。
 *
 * 为什么底色要画在这儿而不是画在每个 .ch 上：.ch 的 background 是不透明的，
 * 而 .stage 是 z-index:-1 的固定层——底色留在章上，织带就永远被盖住，
 * 「全屏常驻 3D」等于没有。所以八章分成敞开 / 实色两种，交替出现。
 *
 * 图版按需下载：只有真的被显示过的那张才会进 DOM。桌面点着 3D 之后一张都不再取。
 */

import { useEffect, useRef, useState } from 'react'
import { onSignal } from '../lib/bus'
import { detectTier } from '../lib/caps'
import { useAsset } from '../lib/asset'

/** 八章各自落在哪一块场上。敞开章（0/3/4/7）靠它拿到底色。 */
const WASH = ['a', 'a', 'a', 'b', 'b', 'b', 'c', 'c'] as const
/** 静态图版：四张，两章共用一张，织带在四个姿态之间是连续的。 */
const PLATE = [0, 0, 1, 1, 2, 2, 3, 3]

type Idle = (cb: () => void, o?: { timeout: number }) => number

export function Stage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [chapter, setChapter] = useState(0)
  const [gl, setGl] = useState(false)
  /** 已经需要过的图版序号。第一屏只有 0，往下滚才逐张补。 */
  const [seen, setSeen] = useState<number[]>([0])
  const asset = useAsset()

  useEffect(
    () =>
      onSignal((s) => {
        setChapter(s.chapter)
        const p = PLATE[s.chapter] ?? 0
        setSeen((prev) => (prev.includes(p) ? prev : [...prev, p]))
      }),
    [],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const tier = detectTier()
    if (tier === 'static') return

    let dispose: (() => void) | null = null
    let dead = false
    let idle = 0
    let timer = 0

    const start = () => {
      if (dead) return
      import('../webgl/Thread')
        .then(({ createThread }) => {
          if (dead) return
          dispose = createThread(canvas, tier).dispose
          setGl(true)
        })
        // 织带点不着不是错误：图版还在，页面照常读。
        .catch(() => {})
    }

    // 首屏交互优先。空闲了再点火，最多等 2.2s。
    const ric = (window as unknown as { requestIdleCallback?: Idle }).requestIdleCallback
    if (ric) idle = ric(start, { timeout: 2200 })
    else timer = window.setTimeout(start, 900)

    return () => {
      dead = true
      const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void })
        .cancelIdleCallback
      if (idle && cic) cic(idle)
      if (timer) clearTimeout(timer)
      dispose?.()
    }
  }, [])

  const wash = WASH[chapter] ?? 'a'
  const plate = PLATE[chapter] ?? 0

  return (
    <div className="stage" aria-hidden="true">
      {(['a', 'b', 'c'] as const).map((w) => (
        <div key={w} className={w === wash ? 'stage__wash is-on' : 'stage__wash'} data-wash={w} />
      ))}
      {seen.map((n) => (
        <img
          key={n}
          className={!gl && n === plate ? 'stage__plate is-on' : 'stage__plate'}
          src={asset(`plates/thread-${n}.webp`)}
          alt=""
          decoding="async"
        />
      ))}
      <canvas id="stage" ref={canvasRef} />
    </div>
  )
}
