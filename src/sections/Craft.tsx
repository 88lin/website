/**
 * 02 能做什么 · 粘性侧栏 + 深墨表头。
 *
 * 骨架来自 demo-readme-tutorial.html 的 .workflow-layout：左栏 0.35fr 粘住，
 * 放一个 Fraunces 巨号章序（opacity .14，是纹理不是内容）与章头；右栏 1fr 走内容。
 * 这样读者滚整整一章，章名一直在视线里，不需要回头找「现在读的是哪一节」。
 *
 * 内容顺序是从抽象到可下单：两条主线（表格）→ 三件能接的活（卡）→ 手上的装备
 * （跑马灯）→ 两件实物证据（色板与导航站）。第一屏说立场，最后一行给证据。
 *
 * 这一章不出现 star / fork：那是第 03 章作品卡的事，全站只出现一次。
 */

import { ArrowOut } from '../components/Icons'
import { Reveal } from '../components/Reveal'
import {
  craftEvidence,
  garden,
  servicesIntro,
  services,
  stack,
  trackA,
  trackB,
  tracksIntro,
  type Track,
} from '../content/site'

type TrackGroup = { id: string; title: string; items: Track[] }

/** 色板证据条：A 组里真正在用的七个色阶，按主 → 辅 → 强调排。 */
const SWATCH = ['brand-deep', 'brand', 'brand-tint', 'highlight', 'pop', 'pop-deep', 'ink']

/** 导航站证据条：四类小站的实际条目数，比例由数组现算，不写死。 */
const GROUPS = ['特效', '工具', '内容', '组件'] as const
const COUNTS = GROUPS.map((g) => garden.filter((x) => x.group === g).length)
const BAR_FILL = ['brand-deep', 'brand', 'brand-tint', 'highlight']

/** 装备清单压平成一条。跑马灯要跑满一圈，所以渲染两份。 */
const GEAR = stack.clusters.flatMap((c) => c.items)

function TrackTable({ t }: { t: TrackGroup }) {
  return (
    <div className="wtable">
      <div className="wt-header">
        <span>{t.id}</span>
        <span>{t.title}</span>
        <span>WHAT IT MEANS</span>
      </div>
      {t.items.map((it, i) => (
        <div className="wt-row" key={it.id}>
          <span className="wt-k">
            {t.id}
            {i + 1}
          </span>
          <span className="wt-t">{it.title}</span>
          <span className="wt-b">{it.body}</span>
        </div>
      ))}
    </div>
  )
}

export function Craft() {
  return (
    <section id="craft" className="ch" data-tone="alt" aria-labelledby="craft-h">
      <div className="wrap">
        <div className="workflow-layout">
          <div className="workflow-side">
            <span className="big-num" aria-hidden="true">
              02
            </span>
            <p className="label-caps">WHAT I CAN DO</p>
            <h2 className="ch-title" id="craft-h">
              {servicesIntro.headline}
            </h2>
            <p className="ch-lede">{servicesIntro.body}</p>
          </div>

          <div className="workflow-main">
            <Reveal className="craft-blk">
              <div>
                <h3 className="craft-h3">{tracksIntro.headline}</h3>
                <p className="craft-lede">{tracksIntro.body}</p>
              </div>
              <TrackTable t={trackA} />
              <TrackTable t={trackB} />
            </Reveal>

            <Reveal className="svc-grid">
              {services.map((s) => (
                <article className="svc-card" data-card="" data-tint={s.tint} key={s.id}>
                  <span className="svc-card__no" aria-hidden="true">
                    {s.no}
                  </span>
                  <h4>{s.title}</h4>
                  <p>{s.body}</p>
                  <ul>
                    {s.deliverables.map((d) => (
                      <li className="pill pill--tint" key={d}>
                        {d}
                      </li>
                    ))}
                  </ul>
                  <p className="svc-card__fit">{s.fit}</p>
                </article>
              ))}
            </Reveal>

            <Reveal className="craft-blk">
              <div>
                <h3 className="craft-h3">{stack.headline}</h3>
                <p className="craft-lede">{stack.body}</p>
              </div>
              {/* 第一份是真内容，第二份只为把带子接成一个环，对读屏隐藏 */}
              <div className="belt">
                <ul>
                  {GEAR.map((g) => (
                    <li className="chip" key={g}>
                      {g}
                    </li>
                  ))}
                  {GEAR.map((g) => (
                    <li className="chip" key={`dup-${g}`} aria-hidden="true">
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal className="craft-blk">
              <div className="ds-row">
                <svg
                  className="ds-row__sw"
                  viewBox="0 0 260 34"
                  role="img"
                  aria-label="A 组色板：蓝三阶、柠檬黄、珊瑚红两阶与墨蓝"
                >
                  {SWATCH.map((c, i) => (
                    <rect key={c} x={i * 37.5} y="0" width="35" height="34" rx="4" fill={`var(--${c})`} />
                  ))}
                </svg>
                <p>
                  <b>{craftEvidence[0].title}</b>
                  {craftEvidence[0].caption}
                </p>
                <a
                  className="cta-btn cta-btn--ghost cta-btn--sm"
                  href={craftEvidence[0].href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {craftEvidence[0].linkLabel} <ArrowOut />
                </a>
              </div>

              <div className="ds-row">
                <svg
                  className="ds-row__sw"
                  viewBox="0 0 260 34"
                  role="img"
                  aria-label={GROUPS.map((g, i) => `${g} ${COUNTS[i]} 个`).join('，')}
                >
                  {COUNTS.reduce<{ x: number; out: React.ReactElement[] }>(
                    (acc, n, i) => {
                      const w = ((260 - 9) * n) / garden.length
                      acc.out.push(
                        <rect
                          key={GROUPS[i]}
                          x={acc.x}
                          y="0"
                          width={w}
                          height="34"
                          rx="4"
                          fill={`var(--${BAR_FILL[i]})`}
                        />,
                      )
                      acc.x += w + 3
                      return acc
                    },
                    { x: 0, out: [] },
                  ).out}
                </svg>
                <p>
                  <b>{craftEvidence[1].title}</b>
                  {craftEvidence[1].caption}
                </p>
                <a
                  className="cta-btn cta-btn--ghost cta-btn--sm"
                  href={craftEvidence[1].href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {craftEvidence[1].linkLabel} <ArrowOut />
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
