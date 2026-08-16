/**
 * 图版一 · 作品星座。
 *
 * 两层同源：
 *  - SSR 直接画 SVG 静态星图（无 JS、手机、reduced-motion 全走这层），
 *    标签与节点 <title> 都在 DOM 里，内容完整可读；
 *  - 桌面端延迟点火 three.js（v5 纪律：420ms idle 后动态 import，不抢 LCP），
 *    点着加 data-gl，SVG 淡出、canvas 淡入。两层共用 lib/atlas 的同一份
 *    确定性布局，换层那一帧构图不跳。
 *
 * HTML 标签层与 tooltip 只在点火后存在；每帧位置由场景回调直写 style，
 * 不走 React state（一帧一次 setState 是在拿渲染器当 protesters 广场）。
 */

import { useEffect, useRef, useState } from 'react'
import {
  atlasLayout,
  atlasBounds,
  orbitPath,
  orbitLabelPoints,
  primaryLabelPos,
  project,
  ORBIT_TINTS,
} from '../lib/atlas'
import { detectTier, prefersReducedMotion } from '../lib/caps'
import { atlasHub } from '../content/site'

const num = (n: number) => n.toLocaleString('en-US')

/* ------------------------------------------------------------ 静态 SVG 层 */

function AtlasSvg() {
  const { hub, primaries, minors, orbits } = atlasLayout()
  const b = atlasBounds()
  const w = b.maxX - b.minX
  const h = b.maxY - b.minY
  const ORBIT_ANGLES = orbitLabelPoints(orbits, { x: 0, y: hub.r * 1.55 + 0.45 }, primaries)

  const haloPts: string[] = []
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2
    const p = project([Math.cos(a) * hub.r * 1.55, 0, Math.sin(a) * hub.r * 1.55])
    haloPts.push(`${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
  }

  return (
    <svg
      className="plate__svg"
      viewBox={`${b.minX.toFixed(3)} ${b.minY.toFixed(3)} ${w.toFixed(3)} ${h.toFixed(3)}`}
      role="img"
      aria-label="作品星座图：以 video_vip 为核心的 22 个原创仓库与 40 个在线小站"
    >
      {orbits.map((o, i) => (
        <path key={o.group} className={`at__ring at__ring--${ORBIT_TINTS[i]}`} d={orbitPath(o)} />
      ))}

      {primaries.map((n) => {
        const p = project(n.pos)
        return (
          <line key={'l' + n.id} className="at__link" x1={0} y1={0} x2={p.x} y2={p.y} />
        )
      })}

      <path className="at__halo" d={'M ' + haloPts.join(' L ') + ' Z'} />

      {minors.map((n) => {
        const p = project(n.pos)
        return (
          <circle key={n.id} className="at__minor" cx={p.x} cy={p.y} r={n.r}>
            <title>{`${n.name}${n.stars ? ` ★ ${n.stars}` : ''}`}</title>
          </circle>
        )
      })}

      {primaries.map((n, i) => {
        const p = project(n.pos)
        const l = primaryLabelPos(n)
        return (
          <g key={n.id}>
            <circle
              className={i % 2 ? 'at__star at__star--deep' : 'at__star'}
              cx={p.x}
              cy={p.y}
              r={n.r}
            >
              <title>{`${n.name} ★ ${n.stars}`}</title>
            </circle>
            <line
              className="at__tick"
              x1={p.x + ((l.x - p.x) * 0.1)}
              y1={p.y + ((l.y - p.y) * 0.1)}
              x2={p.x + ((l.x - p.x) * 0.75)}
              y2={p.y + ((l.y - p.y) * 0.75)}
            />
            <text className="at__name" x={l.x} y={l.y} textAnchor={l.anchor}>
              {n.label}
            </text>
          </g>
        )
      })}

      <g>
        <circle className="at__hub" cx={0} cy={0} r={hub.r}>
          <title>{`video_vip ★ ${num(atlasHub.stars)}`}</title>
        </circle>
        {/* 主星标签放节点下方：上方那半圈是五枚内环名字的地盘 */}
        <line className="at__tick at__tick--hub" x1={0} y1={hub.r * 1.55 + 0.02} x2={0} y2={hub.r * 1.55 + 0.13} />
        <text className="at__name at__name--hub" x={0} y={hub.r * 1.55 + 0.34} textAnchor="middle">
          video_vip
        </text>
        <text className="at__name at__name--sub" x={0} y={hub.r * 1.55 + 0.62} textAnchor="middle">
          ★ {num(atlasHub.stars)}
        </text>
      </g>

      {orbits.map((o, i) => {
        const a = ORBIT_ANGLES[i].p
        return (
          <text key={'ol' + o.group} className={`at__orbit at__orbit--${ORBIT_TINTS[i]}`} x={a.x} y={a.y}>
            {`${o.ring} · ${o.dots.length}`}
          </text>
        )
      })}
    </svg>
  )
}

/* ------------------------------------------------------------ 点火层 */

type LabelDef = { id: string; kind: 'hub' | 'star' | 'orbit'; text: string }

export function Atlas() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const labelsRef = useRef<HTMLDivElement | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)
  const [gl, setGl] = useState(false)

  useEffect(() => {
    if (detectTier() === 'static') return
    let dead = false
    let handle: import('../webgl/atlas').AtlasHandle | null = null
    let io: IntersectionObserver | null = null
    let offScroll: (() => void) | undefined

    const idle =
      (window as Window & {
        requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number
      }).requestIdleCallback ?? ((f: () => void) => window.setTimeout(() => f(), 420))

    const timer = idle(() => {
      import('../webgl/atlas').then(({ mountAtlas }) => {
        const host = hostRef.current
        if (dead || !host) return
        handle = mountAtlas(host, {
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
          onLabels: (ls) => {
            const box = labelsRef.current
            if (!box) return
            for (const l of ls) {
              const el = box.querySelector<HTMLElement>(`[data-lid="${CSS.escape(l.id)}"]`)
              if (!el) continue
              el.style.transform = `translate(${l.x}px, ${l.y}px)`
              el.style.opacity = String(l.dim)
            }
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
            const p = Math.max(0, Math.min(1, (window.innerHeight - r.top) / (window.innerHeight + r.height)))
            handle?.setScroll(p)
          })
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        offScroll = () => {
          window.removeEventListener('scroll', onScroll)
          if (raf) cancelAnimationFrame(raf)
        }
      })
    }, { timeout: 1500 })

    return () => {
      dead = true
      window.clearTimeout(timer as unknown as number)
      io?.disconnect()
      offScroll?.()
      handle?.dispose()
    }
  }, [])

  const { primaries, orbits } = atlasLayout()
  const labels: LabelDef[] = [
    { id: 'hub', kind: 'hub', text: 'video_vip' },
    ...primaries.map((n) => ({ id: n.id, kind: 'star' as const, text: n.label })),
    ...orbits.map((o) => ({ id: 'orbit:' + o.ring, kind: 'orbit' as const, text: `${o.ring} · ${o.dots.length}` })),
  ]

  return (
    <figure className="plate" data-gl={gl ? '1' : undefined}>
      <div className="plate__host" ref={hostRef} />
      <AtlasSvg />
      {gl && (
        <div className="plate__labels" ref={labelsRef} aria-hidden="true">
          {labels.map((l) => (
            <span key={l.id} data-lid={l.id} className={`pl ${l.kind === 'hub' ? 'pl--hub' : l.kind === 'orbit' ? 'pl--orbit' : ''}`}>
              {l.text}
            </span>
          ))}
        </div>
      )}
      {gl && <div className="plate__tip" ref={tipRef} aria-hidden="true" />}
      <figcaption className="plate__cap">
        <b>图版 01 · 作品星座</b>
        <span>22 个原创仓库 · 40 个在线小站</span>
        <span>{gl ? '拖拽旋转 · 点击节点打开' : '静态图版 · 桌面端可交互旋转'}</span>
      </figcaption>
    </figure>
  )
}
