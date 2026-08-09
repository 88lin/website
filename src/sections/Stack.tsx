import { useEffect, useRef } from 'react'
import { stack } from '../content/site'
import { Section } from '../components/Section'
import { fadeUp, revealLines } from '../lib/motion'

/**
 * 出血朱红场 + 白色大圆角卡片 + 7/5/5/7 非对称栅格。
 *
 * V2 是这么做的，用户说「还可以」；V3 把卡片拆成了发丝线上的四组胶囊，而正文
 * 第一句写着「不是徽章墙」——画面正好是一面 41 枚胶囊的徽章墙，文案和版面互相
 * 打脸。卡片回来之后这句话才重新成立：每一簇是一张有边界的白纸，纸上才是标签。
 *
 * 红场用 palette A 自带的 --pop-surface #D43A50（白字 4.65:1 过 AA），
 * 不破格引入 V2 那支不在色板里的朱红。
 *
 * 标题走 revealLines 逐行上推，这是 V2 的入场语言，全站只在这里和 Contact 出现。
 * 3D 活字方阵会聚拢到这块卡片背后放大蓄力（见 webgl/），DOM 层此处留出锚点。
 */
const SPAN = ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-5', 'lg:col-span-7']

export function Stack() {
  const root = useRef<HTMLElement>(null)
  const head = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    if (head.current) revealLines(head.current)
    fadeUp('.stack-card', el, 0.09, 26)
  }, [])

  return (
    <Section id="stack" tone="pop" label="工具 TOOLBOX" ref={root}>
      <div className="max-w-[48ch]" data-type-anchor="stack">
        <h2 className="serif text-d2 stack-head text-on-brand" ref={head}>
          {stack.headlineLines.map((line) => (
            <span key={line} className="reveal-line">
              <span>{line}</span>
            </span>
          ))}
        </h2>
        <p className="mt-5 text-lead text-on-brand">{stack.body}</p>
      </div>

      {/* stack-grid：3D 那一团盘旋的铅字拿这块的上缘当下界，别改类名 */}
      <div className="stack-grid mt-[clamp(38px,4.6vw,64px)] grid grid-cols-12 gap-[clamp(18px,2.2vw,30px)]">
        {stack.clusters.map((c, i) => (
          <div key={c.id} className={`stack-card js-fade col-span-12 ${SPAN[i]}`}>
            <div className="flex items-baseline gap-3">
              <span className="nums text-[0.8125rem] font-bold tracking-[0.14em] text-pop-text">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="serif text-[clamp(1.25rem,1.9vw,1.6rem)] leading-none">{c.title}</h3>
              <span className="nums ml-auto text-sm text-ink-faint">{c.items.length}</span>
            </div>
            <ul className="mt-5 flex flex-wrap gap-2">
              {c.items.map((s) => (
                <li key={s} className="pill pill--wire">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  )
}
