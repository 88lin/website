import { useEffect, useRef, useState } from 'react'
import { projects, type Project } from '../content/site'
import { Cover } from '../components/Cover'
import { gsap, ScrollTrigger, prefersReduced, isNarrow } from '../lib/motion'
import { useScene } from '../webgl/StageContext'

/** 钉住横滚需要一整屏的竖向预算，矮视口直接退回原生横滑 */
const MIN_PIN_H = 780
const canPin = () =>
  typeof window !== 'undefined' && !prefersReduced() && !isNarrow() && window.innerHeight >= MIN_PIN_H

function Card({ p, n }: { p: Project; n: number }) {
  return (
    <article className="card panel flex w-[min(82vw,500px)] shrink-0 snap-center flex-col overflow-hidden">
      <Cover project={p} />
      <div className="flex grow flex-col gap-5 p-6 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <span className="mono text-[0.875rem] tracking-[0.06em] text-ink-70">
            {String(n).padStart(2, '0')} / {p.kind}
          </span>
          <span className="mono text-[0.875rem] tracking-[0.06em] text-ink-70">{p.year}</span>
        </div>

        <div>
          <h3 className="display text-[clamp(1.55rem,2.4vw,2.1rem)] leading-none tracking-tight">{p.name}</h3>
          <p className="mt-2 text-[1rem] text-ink-70">{p.cn}</p>
        </div>

        <p className="text-[1rem] leading-[1.75]">{p.blurb}</p>

        <ul className="flex flex-wrap gap-x-2 gap-y-2">
          {p.stack.map((s) => (
            <li key={s} className="mono rounded-full border border-ink/20 px-3 py-1 text-[0.875rem] tracking-[0.06em] text-ink-70">
              {s}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-ink/12 pt-5">
          <p className="mono text-[0.875rem] tabular-nums text-ink-70">
            {p.stars.toLocaleString('en-US')} Star · {p.forks.toLocaleString('en-US')} Fork
          </p>
          <div className="flex items-center gap-4">
            {p.live && (
              <a href={p.live} target="_blank" rel="noopener noreferrer" className="inline-link text-[0.9375rem]">
                在线
              </a>
            )}
            <a href={p.repo} target="_blank" rel="noopener noreferrer" className="inline-link text-[0.9375rem]">
              源码
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}

function Heading({ hint }: { hint: string }) {
  return (
    <>
      <h2 className="display text-d2">精选作品</h2>
      <p className="mono mt-4 text-[0.875rem] tracking-[0.06em] text-ink-70">
        {projects.length} 个原创项目 · {hint}
      </p>
    </>
  )
}

export function Work() {
  const ref = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  // 预渲染时先按不钉住输出，水合后再按真实视口切换，避免服务端/客户端标记不一致
  const [pinned, setPinned] = useState(false)

  useScene(
    ref,
    { clusterX: -3.0, clusterY: 0.9, clusterScale: 0.72, spread: 1.05, spin: 0.17, tilt: 0.14, dispersion: 4.6, glow: 0.85, tint: 0.46, camZ: 7.4, exposure: 0.98 },
    { clusterX: -0.55, clusterY: -1.15, clusterScale: 0.62, spread: 0.8 }
  )

  useEffect(() => {
    const section = ref.current
    const track = trackRef.current
    const pinEl = pinRef.current
    if (!section || !track || !pinEl) return

    if (!canPin()) {
      setPinned(false)
      return
    }
    setPinned(true)

    const ctx = gsap.context(() => {
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 64)
      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => '+=' + distance(),
          pin: pinEl,
          scrub: 0.65,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
      gsap.to('.work-progress', {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => '+=' + distance(),
          scrub: true,
          invalidateOnRefresh: true,
        },
      })
    }, section)

    const onResize = () => ScrollTrigger.refresh()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      ctx.revert()
    }
  }, [])

  return (
    <section ref={ref} id="work" className="relative">
      <div
        ref={pinRef}
        className={
          pinned
            ? 'flex h-[100svh] flex-col justify-center pt-[68px] pb-6'
            : 'py-[clamp(4rem,9vw,7rem)]'
        }
      >
        {!pinned && (
          <div className="shell pb-9">
            <div className="max-w-[42ch]">
              <Heading hint="左右滑动" />
            </div>
          </div>
        )}

        <div
          ref={trackRef}
          className={`h-track shell-x gap-6 ${pinned ? '' : 'snap-x snap-mandatory overflow-x-auto pb-4'}`}
        >
          {pinned && (
            <div className="flex w-[min(72vw,340px)] shrink-0 flex-col justify-end pb-2 pr-2">
              <Heading hint="继续滚动" />
              <span aria-hidden className="mono mt-8 text-[1.4rem] leading-none text-vermilion-deep">
                &rarr;
              </span>
            </div>
          )}

          {projects.map((p, i) => (
            <Card key={p.slug} p={p} n={i + 1} />
          ))}

          <div className="flex w-[min(62vw,320px)] shrink-0 snap-center items-center">
            <a
              href="https://github.com/88lin?tab=repositories&type=source"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full w-full flex-col justify-between rounded-lg border border-dashed border-ink/30 p-8 transition-colors hover:border-vermilion-deep"
            >
              <span className="mono text-[0.875rem] tracking-[0.06em] text-ink-70">07 / 更多</span>
              <span className="display text-[clamp(1.7rem,3vw,2.4rem)] leading-none tracking-tight">
                其余 15 个
                <br />
                原创仓库
              </span>
              <span className="mono inline-flex items-center gap-2 text-[0.9375rem] text-ink-70 transition-colors group-hover:text-vermilion-deep">
                去 GitHub
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                  &rarr;
                </span>
              </span>
            </a>
          </div>
        </div>

        {pinned && (
          <div className="shell pt-6">
            <div className="h-px w-full bg-ink/15">
              <div className="work-progress h-px origin-left scale-x-0 bg-vermilion" />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
