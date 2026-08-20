/**
 * 图版 01 · 铸字盘。
 *
 * 首屏论点的 18 个字铸成活字，排在 6×3 的字盘里。两层同源：
 *  - SSR 直接画 SVG 静态字盘（无 JS、手机、reduced-motion 全走这层），
 *    每个字与词都在 DOM 里，内容完整可读；
 *  - 桌面端延迟点火 three.js（v5 纪律：idle 后动态 import，不抢 LCP），
 *    点着加 data-gl，SVG 淡出、canvas 淡入。两层共用 lib/typecase 的同一份
 *    确定性布局，换层那一帧构图不跳。
 *
 * 交互契约（WebGL 层）：指针视差微倾字盘；悬停某枚字 → 它抬起并出 tooltip
 * （字 + 所属词）。不拦页面滚动（host 上 touch-action: pan-y）。
 */

import { useEffect, useRef, useState } from 'react'
import {
  caseLayout,
  CASE_PAD,
  CASE_W,
  CASE_H,
  CELL,
  FACE,
  FACE_COLOR,
  TRAY_COLOR,
  TRAY_LINE,
} from '../lib/typecase'
import { detectTier, prefersReducedMotion } from '../lib/caps'

/* ------------------------------------------------------------ 静态 SVG 层 */

const U = 100 // 每字格的 SVG 用户单位

function TypeCaseSvg() {
  const slugs = caseLayout()
  const w = CASE_W * U
  const h = CASE_H * U

  return (
    <svg
      className="plate__svg"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="铸字盘：首屏论点「把前沿 AI 变成可交付、可维护的工程结果」的 18 枚活字"
    >
      {/* 字盘外框：墨线双层，像木盘的金属包边 */}
      <rect
        className="tc__tray"
        x={2}
        y={2}
        width={w - 4}
        height={h - 4}
        rx={10}
        fill={TRAY_COLOR}
        stroke={TRAY_LINE}
        strokeWidth={2.5}
      />
      <rect
        x={9}
        y={9}
        width={w - 18}
        height={h - 18}
        rx={6}
        fill="none"
        stroke={TRAY_LINE}
        strokeWidth={0.8}
        opacity={0.4}
      />

      {slugs.map((s) => {
        const cx = (CASE_PAD + s.col * CELL + CELL / 2 + s.dx) * U
        const cy = (CASE_PAD + s.row * CELL + CELL / 2 + s.dy) * U
        const half = (FACE / 2) * U
        const deg = (s.rot * 180) / Math.PI
        const c = FACE_COLOR[s.face]
        return (
          <g key={s.ch + s.col + '-' + s.row} transform={`translate(${cx} ${cy}) rotate(${deg.toFixed(2)})`}>
            {/* 字身影子：右下偏移的深色块，给铅字一点厚度 */}
            <rect
              x={-half + 2.5}
              y={-half + 3.5}
              width={half * 2}
              height={half * 2}
              rx={5}
              fill={TRAY_LINE}
              opacity={0.16}
            />
            <rect
              x={-half}
              y={-half}
              width={half * 2}
              height={half * 2}
              rx={5}
              fill={c.bg}
              stroke={TRAY_LINE}
              strokeWidth={1.4}
            />
            <text
              className="tc__ch"
              x={0}
              y={1}
              textAnchor="middle"
              dominantBaseline="central"
              fill={c.fg}
            >
              {s.ch}
            </text>
            <title>{`${s.ch} · ${s.word}`}</title>
          </g>
        )
      })}
    </svg>
  )
}

/* ------------------------------------------------------------ 点火层 */

export function TypeCase() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)
  const [gl, setGl] = useState(false)

  useEffect(() => {
    if (detectTier() === 'static') return
    let dead = false
    let handle: import('../webgl/typecase').TypeCaseHandle | null = null
    let io: IntersectionObserver | null = null
    let offScroll: (() => void) | undefined

    const idle =
      (window as Window & {
        requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number
      }).requestIdleCallback ?? ((f: () => void) => window.setTimeout(() => f(), 420))

    const timer = idle(
      () => {
        import('../webgl/typecase').then(({ mountTypeCase }) => {
          const host = hostRef.current
          if (dead || !host) return
          handle = mountTypeCase(host, {
            reducedMotion: prefersReducedMotion(),
            onHover: (h) => {
              const tip = tipRef.current
              if (!tip) return
              if (!h) {
                tip.style.opacity = '0'
                return
              }
              tip.textContent = `${h.title} · ${h.sub}`
              tip.style.transform = `translate(${h.x + 14}px, ${h.y + 14}px)`
              tip.style.opacity = '1'
            },
          })
          if (dead) {
            handle.dispose()
            return
          }
          setGl(true)

          io = new IntersectionObserver(
            (entries) => entries.forEach((e) => handle?.setActive(e.isIntersecting)),
            { rootMargin: '120px 0px' },
          )
          io.observe(host)

          let raf = 0
          const onScroll = () => {
            if (raf) return
            raf = requestAnimationFrame(() => {
              raf = 0
              const r = host.getBoundingClientRect()
              const p = Math.max(
                0,
                Math.min(1, (window.innerHeight - r.top) / (window.innerHeight + r.height)),
              )
              handle?.setScroll(p)
            })
          }
          window.addEventListener('scroll', onScroll, { passive: true })
          offScroll = () => {
            window.removeEventListener('scroll', onScroll)
            if (raf) cancelAnimationFrame(raf)
          }
        })
      },
      { timeout: 1500 },
    )

    return () => {
      dead = true
      window.clearTimeout(timer as unknown as number)
      io?.disconnect()
      offScroll?.()
      handle?.dispose()
    }
  }, [])

  return (
    <figure className="plate plate--typecase" data-gl={gl ? '1' : undefined}>
      <div className="plate__host" ref={hostRef} />
      <TypeCaseSvg />
      {gl && <div className="plate__tip" ref={tipRef} aria-hidden="true" />}
      <figcaption className="plate__cap">
        <b>图版 01 · 铸字盘</b>
        <span>18 枚活字 · 首屏论点的排印底稿</span>
        <span>{gl ? '悬停抬字 · 逐字可验' : '静态图版 · 桌面端可交互'}</span>
      </figcaption>
    </figure>
  )
}
