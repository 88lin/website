import { useEffect, useRef } from 'react'
import { tracksIntro, trackA, trackB } from '../content/site'
import { Mark } from '../components/ui'
import { Section } from '../components/Section'
import { revealChars, revealMask } from '../lib/motion'

/**
 * 对开页。
 *
 * 「两条主线，一个交点」这句话本身就是版式说明书：把区块做成一张摊开的对开纸，
 * 中缝一条 1px 实线，两侧底色一浅一深，左栏文字右对齐、右栏文字左对齐，全部朝
 * 中缝靠拢——交点不是画一个图标去比喻，是让排版真的在那里相交。
 * 入场时两栏各自从中缝向外揭开。
 */
function Column({
  kicker,
  items,
  side,
}: {
  kicker: string
  items: { id: string; title: string; body: string }[]
  side: 'l' | 'r'
}) {
  return (
    <div className={`spread__col spread__col--${side}`}>
      <p className="spread__kicker">{kicker}</p>
      <ul className="mt-7 space-y-7">
        {items.map((t, i) => (
          <li key={t.id}>
            <div className="spread__head">
              <span className="hand text-[1.1rem] text-brand-deep">0{i + 1}</span>
              <h3 className="serif text-d3">{t.title}</h3>
            </div>
            <p className="mt-2 text-ink-light">{t.body}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Tracks() {
  const root = useRef<HTMLElement>(null)
  const head = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    if (head.current) revealChars(head.current, 0.026)
    const cols = el.querySelector<HTMLElement>('.spread__grid')
    if (cols) {
      revealMask('.spread__col--l', cols, 'r', 0)
      revealMask('.spread__col--r', cols, 'l', 0)
    }
  }, [])

  return (
    <Section id="tracks" tone="cream" label="主线 TWO TRACKS" className="sec--spread" ref={root}>
      {/* 标题横跨中缝压在对开页上方 */}
      <div className="max-w-[58ch]">
        <h2 className="serif text-d2" ref={head}>
          两条主线，<Mark>一个交点</Mark>
        </h2>
        <p className="mt-5 text-lead text-ink-light">{tracksIntro.body}</p>
      </div>

      <div className="spread__grid mt-[clamp(46px,6vw,86px)]">
        <div aria-hidden className="spread__seam" />
        <div aria-hidden className="spread__cross" />
        <Column kicker={trackA.kicker} items={trackA.items} side="l" />
        <Column kicker={trackB.kicker} items={trackB.items} side="r" />
      </div>
    </Section>
  )
}
