import { useEffect, useRef, useState } from 'react'
import { projects, type Project } from '../content/site'
import { Cover } from '../components/Cover'
import { Mark } from '../components/ui'
import { Section } from '../components/Section'
import { dragTrack, type TrackHandle } from '../lib/dragTrack'
import { parallax, revealChars } from '../lib/motion'

/**
 * 精选作品：左侧钉住的标题列 + 右侧可拖轨道。
 *
 * 版式回到 V2 的非对称构图——左边一列大标题钉在视野里不动，右边的轨道从标题列
 * 右缘起步、只向右出血。V3 那种「标题在上、四张小卡被视口两侧同时裁断」的通用
 * marquee 看起来像没做完；轨道两头都被切，等于告诉人两个方向都有内容却都够不着。
 * 现在左边是硬边界，右边渐隐，方向只有一个。
 *
 * 卡片从 380px 放大到 clamp(300px,34vw,500px)，桌面正好露出两张多一点。
 * 轨道的物理见 lib/dragTrack.ts。
 */
function WorkCard({ p, clone = false }: { p: Project; clone?: boolean }) {
  const primary = p.live ?? p.repo
  return (
    <article
      className="work-card wtrack__item card flex flex-col overflow-hidden"
      data-clone={clone ? 'true' : undefined}
      {...(clone ? { 'aria-hidden': true } : null)}
    >
      <Cover project={p} />

      <div className="flex flex-1 flex-col p-[clamp(20px,2.2vw,26px)]">
        <div className="flex items-baseline justify-between gap-3">
          <span className="eyebrow text-brand-text">{p.kind}</span>
          <span className="eyebrow text-ink-faint">{p.year}</span>
        </div>

        <h3 className="serif mt-3 text-[1.3rem] leading-snug">
          <a href={primary} target="_blank" rel="noreferrer noopener" tabIndex={clone ? -1 : 0}>
            <span className="work-card__title">{p.name}</span>
          </a>
        </h3>
        <p className="mt-1 text-sm font-medium text-ink-light">{p.cn}</p>
        <p className="mt-3.5 line-clamp-3 text-[0.9375rem] text-ink-light">{p.blurb}</p>

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {p.stack.slice(0, 3).map((s) => (
            <li key={s} className="pill pill--static text-xs">
              {s}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-[18px]">
          <span className="nums text-sm text-ink-light">
            <span aria-hidden>★</span> {p.stars.toLocaleString('en-US')}
            <span className="mx-2 text-ink-faint">/</span>
            <span aria-hidden>⑂</span> {p.forks}
          </span>
          <span className="flex items-center gap-3 text-sm font-semibold">
            {p.live ? (
              <a
                href={p.live}
                target="_blank"
                rel="noreferrer noopener"
                tabIndex={clone ? -1 : 0}
                className="link"
              >
                在线
              </a>
            ) : null}
            <a
              href={p.repo}
              target="_blank"
              rel="noreferrer noopener"
              tabIndex={clone ? -1 : 0}
              className="link"
            >
              仓库
            </a>
          </span>
        </div>
      </div>
    </article>
  )
}

export function Work() {
  const root = useRef<HTMLElement>(null)
  const view = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const handle = useRef<TrackHandle | null>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const head = el.querySelector<HTMLElement>('.work-aside__title')
    if (head) revealChars(head, 0.03)
    parallax('.work-aside__note', el, 10)

    if (view.current && inner.current) {
      handle.current = dragTrack(view.current, inner.current)
      // 审计（检查 12）要读轨道内部状态
      ;(window as unknown as { __wtrack?: TrackHandle }).__wtrack = handle.current
    }

    // 轨道是横向自动滚的，浏览器对 loading="lazy" 的横轴几乎不做提前量：
    // 实测卡片要滑到视口内约 40% 才开始请求，用户会看到一张空白卡片滑进来再闪出图。
    // 所以在整个分区接近视口时，一次性把轨道里的图全部转成 eager。
    const eager = () => {
      el.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => {
        img.loading = 'eager'
      })
    }
    let io: IntersectionObserver | null = null
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            eager()
            io?.disconnect()
          }
        },
        { rootMargin: '600px 0px' }
      )
      io.observe(el)
    } else {
      eager()
    }

    return () => {
      io?.disconnect()
      handle.current?.destroy()
      handle.current = null
    }
  }, [])

  useEffect(() => {
    handle.current?.setPaused(paused)
  }, [paused])

  return (
    <Section id="work" tone="creamDark" label="作品 SELECTED WORK" ref={root}>
      <div className="work-grid">
        <div className="work-aside">
          <h2 className="work-aside__title serif text-d2">
            精选
            <br />
            <Mark>作品</Mark>
          </h2>
          <p className="work-aside__note mt-6 max-w-[24ch] text-ink-light">
            六个还在维护的项目，按 star 排。轨道可以直接拖，松手会自己滑一段。
          </p>
          {/* 窄屏不巡航，也没有方向键：这排控件在手机上没有对应物，直接不出现 */}
          <div className="mt-7 hidden flex-wrap items-center gap-3 md:flex">
            <button
              type="button"
              className="pill"
              aria-pressed={paused}
              onClick={() => setPaused((s) => !s)}
            >
              {paused ? '继续巡航' : '暂停巡航'}
            </button>
            <span className="text-[0.8125rem] text-ink-faint">← → 也能推</span>
          </div>
        </div>

        <div
          className="wtrack"
          ref={view}
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label="精选作品轨道，可拖拽或用左右方向键"
          data-drag="off"
        >
          <div className="wtrack__inner" ref={inner}>
            {projects.map((p) => (
              <WorkCard key={p.slug} p={p} />
            ))}
            {projects.map((p) => (
              <WorkCard key={`clone-${p.slug}`} p={p} clone />
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}
