import { useEffect, useMemo, useRef, useState } from 'react'
import { garden, gardenIntro, type GardenGroup } from '../content/site'
import { fadeUp, gsap, prefersReduced, isNarrow } from '../lib/motion'
import { useScene, useAnchorEl } from '../webgl/StageContext'
import { asset } from '../lib/asset'

const ORDER: GardenGroup[] = ['特效', '工具', '内容', '组件']

const SKIN: Record<GardenGroup, string> = {
  特效: 'hover:bg-vermilion hover:text-ink focus-visible:bg-vermilion focus-visible:text-ink',
  工具: 'hover:bg-cobalt hover:text-paper focus-visible:bg-cobalt focus-visible:text-paper',
  内容: 'hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper',
  组件: 'hover:bg-paper-2 hover:border-ink focus-visible:bg-paper-2 focus-visible:border-ink',
}

const TILE_W = 224
const TILE_H = 58
const GAP = 12
const COLS = 3
const CLUSTER_W = COLS * TILE_W + (COLS - 1) * GAP
const HEAD_H = 74
const COL_GAP = 190
const PAD = 44
const PLANE_W = 2 * CLUSTER_W + COL_GAP + 2 * PAD
const ROW2 = PAD + HEAD_H + 5 * (TILE_H + GAP) + 84
const ORIGIN: Record<GardenGroup, [number, number]> = {
  特效: [PAD, PAD],
  工具: [PAD + CLUSTER_W + COL_GAP, PAD],
  内容: [PAD, ROW2],
  组件: [PAD + CLUSTER_W + COL_GAP, ROW2],
}

export function Garden() {
  const ref = useRef<HTMLElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  const planeRef = useRef<HTMLDivElement>(null)
  const rabbitRef = useRef<HTMLDivElement>(null)
  // 同 Work：初始值必须是预渲染时的确定值，真实视口在水合后测
  const [narrow, setNarrow] = useState(false)
  const [reduced, setReduced] = useState(false)

  useScene(
    ref,
    { formX: -6.4, formY: 2.3, formScale: 1.4, amp: 0.3, freq: 1.1, twist: 0.7, spin: 0.42, camZ: 6.4, particles: 0.4, exposure: 1.0 },
    { rabbit: 1 }
  )
  useAnchorEl(rabbitRef, 'rabbit', 1.0)

  const laid = useMemo(() => {
    const out: { name: string; href: string; group: GardenGroup; x: number; y: number }[] = []
    for (const g of ORDER) {
      const items = garden.filter((i) => i.group === g)
      const [ox, oy] = ORIGIN[g]
      items.forEach((it, i) => {
        out.push({
          ...it,
          x: ox + (i % COLS) * (TILE_W + GAP),
          y: oy + HEAD_H + Math.floor(i / COLS) * (TILE_H + GAP),
        })
      })
    }
    return out
  }, [])

  const planeH = useMemo(() => Math.max(...laid.map((t) => t.y)) + TILE_H + PAD, [laid])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => fadeUp('.garden-fade', el, 0.08, 22), el)
    const onR = () => setNarrow(isNarrow())
    onR()
    setReduced(prefersReduced())
    window.addEventListener('resize', onR)
    return () => {
      ctx.revert()
      window.removeEventListener('resize', onR)
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    const plane = planeRef.current
    if (narrow || !view || !plane) return

    let x = 0
    let y = 0
    let vx = 0
    let vy = 0
    let dragging = false
    let moved = 0
    let px = 0
    let py = 0
    let raf = 0

    const bounds = () => {
      const r = view.getBoundingClientRect()
      return { minX: Math.min(0, r.width - PLANE_W), minY: Math.min(0, r.height - planeH) }
    }

    const clamp = () => {
      const b = bounds()
      x = Math.max(b.minX, Math.min(0, x))
      y = Math.max(b.minY, Math.min(0, y))
    }

    const draw = () => {
      plane.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
    }

    // 起始停在左上角，第一屏就能看见完整的第一组，右下方留出「还有更多」的暗示
    x = 0
    y = 0
    clamp()
    draw()

    const loop = () => {
      if (!dragging) {
        vx *= 0.93
        vy *= 0.93
        if (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) {
          x += vx
          y += vy
          clamp()
          draw()
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onDown = (e: PointerEvent) => {
      dragging = true
      moved = 0
      px = e.clientX
      py = e.clientY
      vx = 0
      vy = 0
      view.classList.add('is-dragging')
      view.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - px
      const dy = e.clientY - py
      px = e.clientX
      py = e.clientY
      moved += Math.abs(dx) + Math.abs(dy)
      x += dx
      y += dy
      vx = dx
      vy = dy
      clamp()
      draw()
    }
    const onUp = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      view.classList.remove('is-dragging')
      try {
        view.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
    const onClick = (e: MouseEvent) => {
      if (moved > 8) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    // 键盘 Tab 进入的磁贴自动带进视野
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement
      if (!t?.dataset?.tx) return
      const r = view.getBoundingClientRect()
      x = r.width / 2 - Number(t.dataset.tx) - TILE_W / 2
      y = r.height / 2 - Number(t.dataset.ty) - TILE_H / 2
      vx = 0
      vy = 0
      clamp()
      draw()
    }

    view.addEventListener('pointerdown', onDown)
    view.addEventListener('pointermove', onMove)
    view.addEventListener('pointerup', onUp)
    view.addEventListener('pointercancel', onUp)
    view.addEventListener('click', onClick, true)
    view.addEventListener('focusin', onFocusIn)
    const onResize = () => {
      clamp()
      draw()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      view.removeEventListener('pointerdown', onDown)
      view.removeEventListener('pointermove', onMove)
      view.removeEventListener('pointerup', onUp)
      view.removeEventListener('pointercancel', onUp)
      view.removeEventListener('click', onClick, true)
      view.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('resize', onResize)
    }
  }, [planeH, narrow])

  return (
    <section ref={ref} id="garden" className="relative border-y border-ink/12 py-[clamp(4rem,9vw,7rem)]">
      <div className="shell mb-10">
        <div className="grid grid-cols-12 items-end gap-x-6 gap-y-8">
          <div className="col-span-12 max-w-[46ch] lg:col-span-6">
            <h2 className="display text-d2 garden-fade opacity-0">{gardenIntro.headline}</h2>
            <p className="garden-fade mt-5 text-lead text-ink-60 opacity-0">{gardenIntro.body}</p>
          </div>
          <div className="relative col-span-12 lg:col-span-6">
            <div
              ref={rabbitRef}
              aria-hidden
              className="pointer-events-none absolute bottom-0 right-[8%] hidden aspect-square w-[min(20vw,264px)] lg:block"
            />
            {/* 窄屏补位：宽屏这张图由 WebGL 素材层渲染 */}
            <img
              src={asset('subjects/rabbit.webp')}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className="subject-img mb-1 aspect-square w-[min(52vw,240px)] object-cover lg:hidden"
            />
            <a
              href={gardenIntro.hub}
              target="_blank"
              rel="noopener noreferrer"
              className="garden-fade inline-link relative pb-1 text-[0.92rem] opacity-0 lg:float-right"
            >
              全部 {garden.length} 个页面
            </a>
          </div>
        </div>
      </div>

      <div className="shell">
        {narrow ? (
          <div className="space-y-10">
            {ORDER.map((g) => (
              <div key={g}>
                <h3 className="display flex items-baseline gap-3 border-b border-ink/20 pb-2 text-[1.35rem] leading-none tracking-tight">
                  {g}
                  <span className="mono text-[0.72rem] tracking-[0.14em] text-ink-60">
                    {garden.filter((i) => i.group === g).length}
                  </span>
                </h3>
                <ul className="mt-4 grid grid-cols-2 gap-2">
                  {garden
                    .filter((i) => i.group === g)
                    .map((t) => (
                      <li key={t.href + t.name}>
                        <a
                          href={t.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex h-full items-center justify-between gap-2 border border-ink/18 bg-paper px-3 py-3 text-[0.86rem] ${SKIN[g]}`}
                        >
                          <span className="truncate">{t.name}</span>
                          <span aria-hidden className="mono shrink-0 text-[0.7rem] opacity-60">
                            &#8599;
                          </span>
                        </a>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={viewRef}
            className="drag-plane relative h-[clamp(420px,64vh,660px)] overflow-hidden border border-ink/20 bg-paper-2/70"
            role="group"
            aria-label="可拖动的作品画布"
          >
            <div className="grid-tex pointer-events-none absolute inset-0 opacity-70" aria-hidden />
            <div
              ref={planeRef}
              className="absolute left-0 top-0"
              style={{ width: PLANE_W, height: planeH, willChange: 'transform' }}
            >
              {ORDER.map((g) => (
                <h3
                  key={g}
                  className="display pointer-events-none absolute text-[clamp(1.5rem,2.2vw,2rem)] leading-none tracking-tight text-ink/55"
                  style={{ left: ORIGIN[g][0], top: ORIGIN[g][1], width: CLUSTER_W }}
                >
                  {g}
                  <span className="mono ml-3 align-middle text-[0.72rem] tracking-[0.14em]">
                    {garden.filter((i) => i.group === g).length}
                  </span>
                </h3>
              ))}
              {laid.map((t) => (
                <a
                  key={t.href + t.name}
                  href={t.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-tx={t.x}
                  data-ty={t.y}
                  className={`absolute flex items-center justify-between gap-3 border border-ink/18 bg-paper px-4 text-[0.9rem] transition-colors duration-200 ${SKIN[t.group]}`}
                  style={{ left: t.x, top: t.y, width: TILE_W, height: TILE_H }}
                >
                  <span className="truncate">{t.name}</span>
                  <span aria-hidden className="mono shrink-0 text-[0.72rem] opacity-60">
                    &#8599;
                  </span>
                </a>
              ))}
            </div>

            <p className="mono pointer-events-none absolute bottom-3 right-4 border border-ink/15 bg-paper/85 px-2.5 py-1 text-[0.7rem] tracking-[0.16em] text-ink-60">
              {reduced ? '点选打开' : '按住拖动'}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
