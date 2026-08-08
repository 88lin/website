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
    <article className="card panel flex w-[min(82vw,500px)] shrink-0 snap-center flex-col">
      <Cover project={p} />
      <div className="flex grow flex-col gap-5 p-6 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <span className="mono text-[0.72rem] tracking-[0.16em] text-ink-60">
            {String(n).padStart(2, '0')} / {p.kind}
          </span>
          <span className="mono text-[0.72rem] tracking-[0.16em] text-ink-60">{p.year}</span>
        </div>

        <div>
          <h3 className="display text-[clamp(1.55rem,2.4vw,2.1rem)] leading-none tracking-tight">{p.name}</h3>
          <p className="mt-2 text-[0.92rem] text-ink-60">{p.cn}</p>
        </div>

        <p className="text-[0.95rem] leading-[1.75]">{p.blurb}</p>

        <ul className="flex flex-wrap gap-x-2 gap-y-2">
          {p.stack.map((s) => (
            <li key={s} className="mono border border-ink/18 px-2.5 py-1 text-[0.7rem] tracking-[0.06em] text-ink-60">
              {s}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-ink/12 pt-5">
          <p className="mono text-[0.78rem] tabular-nums text-ink-60">
            {p.stars.toLocaleString('en-US')} Star · {p.forks.toLocaleString('en-US')} Fork
          </p>
          <div className="flex items-center gap-4">
            {p.live && (
              <a href={p.live} target="_blank" rel="noopener noreferrer" className="inline-link text-[0.88rem]">
                在线
              </a>
            )}
            <a href={p.repo} target="_blank" rel="noopener noreferrer" className="inline-link text-[0.88rem]">
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
      <p className="mono mt-4 text-[0.74rem] tracking-[0.14em] text-ink-60">
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

  useScene(ref, { formX: -2.6, formY: -0.25, formScale: 1.05, amp: 0.24, freq: 1.05, twist: 0.55, spin: 0.24, camZ: 7.4, particles: 0.35, exposure: 0.95 })

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
              className="group flex h-full w-full flex-col justify-between border border-dashed border-ink/30 p-8 transition-colors hover:border-vermilion-deep"
            >
              <span className="mono text-[0.72rem] tracking-[0.16em] text-ink-60">07 / 更多</span>
              <span className="display text-[clamp(1.7rem,3vw,2.4rem)] leading-none tracking-tight">
                其余 15 个
                <br />
                原创仓库
              </span>
              <span className="mono inline-flex items-center gap-2 text-[0.84rem] text-ink-60 transition-colors group-hover:text-vermilion-deep">
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
