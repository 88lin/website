import { useEffect, useMemo, useRef, useState } from 'react'
import { garden, gardenIntro, type GardenGroup, type GardenItem } from '../content/site'
import { Mark, Note } from '../components/ui'
import { Section } from '../components/Section'
import { fadeUp, radialPop } from '../lib/motion'

/**
 * 形状排版的标签云。
 *
 * 两处改动，都是把装饰换成信息：
 *
 * 1. 字号不再按名字长度给（那是排版噪声冒充信息层级），改成从链接结构里读出来的
 *    真实权重：独立域名 > 独立命名仓库 > 单页 demo > 系列续作。
 *    「烟花 II–V」「notion/3」这类系列成员天生比 lofi.88lin.eu.org 轻，云的疏密
 *    因此对应他实际投入的分量。
 * 2. 整片云绕开一个圆形空洞（float + shape-outside），洞里放手写批注。
 *    胶囊走 inline 流才会被 shape-outside 挤开——flex item 不参与行盒排布。
 *
 * 标题整体右移到版心右缘，与左侧基准线拉开一整个版心的距离：全站只有这一处
 * 让标题逃到右边，标签流反过来贴着线走。
 */
const GROUPS: GardenGroup[] = ['特效', '工具', '内容', '组件']
type Filter = '全部' | GardenGroup
type Size = 'xl' | 'l' | 'm' | 's'

const GH = 'https://88lin.github.io/'

/**
 * 从 href 结构推权重：
 *   +2 独立域名（真的在跑的产品，不是 gh-pages 上的一个目录）
 *   +1 独立命名仓库（含连字符或内部大写，如 TextCard-Studio / PaperStudio）
 *   -1 系列续作（路径以数字结尾，或挂在 notion/ 下的组件）
 */
function weightOf(item: GardenItem): Size {
  if (!item.href.startsWith(GH)) return 'xl'
  const path = item.href.slice(GH.length).replace(/\/$/, '')
  let score = 0
  if (path.includes('-') || /[a-z][A-Z]/.test(path)) score += 1
  if (/^notion\//.test(path) || /\d$/.test(path)) score -= 1
  return score >= 1 ? 'l' : score === 0 ? 'm' : 's'
}

export function Garden() {
  const root = useRef<HTMLElement>(null)
  const flow = useRef<HTMLUListElement>(null)
  const [filter, setFilter] = useState<Filter>('全部')

  const counts = useMemo(() => {
    const m = new Map<Filter, number>([['全部', garden.length]])
    GROUPS.forEach((g) => m.set(g, garden.filter((i) => i.group === g).length))
    return m
  }, [])

  const shown = filter === '全部' ? garden : garden.filter((i) => i.group === filter)

  useEffect(() => {
    const el = root.current
    if (!el) return
    fadeUp('.garden-fade', el, 0.07, 22)
    if (flow.current) radialPop(flow.current, '.garden-pill')
  }, [])

  return (
    <Section id="garden" tone="creamDark" label="花园 DIGITAL GARDEN" ref={root}>
      {/* 标题逃到版心右缘 */}
      <div className="garden-head garden-fade js-fade ml-auto max-w-[44ch] text-right">
        <h2 className="serif text-d2">
          数字<Mark>花园</Mark>
        </h2>
        <p className="mt-5 text-lead text-ink-light">{gardenIntro.body}</p>
      </div>

      {/* 筛选栏留在左边，贴着基准线 —— 与右上角的标题形成对角张力 */}
      <div
        className="garden-fade js-fade mt-[clamp(30px,3.6vw,48px)] flex flex-wrap items-center gap-2.5"
        role="group"
        aria-label="按类型筛选"
      >
        {(['全部', ...GROUPS] as Filter[]).map((g) => (
          <button
            key={g}
            type="button"
            className="pill"
            aria-pressed={filter === g}
            onClick={() => setFilter(g)}
          >
            {g}
            <span className="nums text-[0.8125rem] opacity-80">{counts.get(g)}</span>
          </button>
        ))}
      </div>

      <ul className="garden-flow garden-flow--shape mt-8" ref={flow}>
        {/* 云里的圆形空洞。float + shape-outside，胶囊会绕着它排。 */}
        <li className="garden-void">
          <p>
            <span className="nums block text-[clamp(2rem,3.4vw,3rem)] leading-none">
              {shown.length}
            </span>
            <Note className="mt-2.5 block text-[1.2rem] text-ink-light">
              个还活着，都能点开
            </Note>
          </p>
        </li>

        {shown.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              target="_blank"
              rel="noreferrer noopener"
              className="garden-pill inline-flex items-center"
              data-size={weightOf(item)}
              data-group={item.group}
            >
              <span aria-hidden className="garden-pill__dot" />
              {item.name}
            </a>
          </li>
        ))}
      </ul>

      <p className="garden-fade js-fade mt-9 text-[0.9375rem] text-ink-light">
        全部入口收在{' '}
        <a href={gardenIntro.hub} target="_blank" rel="noreferrer noopener" className="link">
          88lin.github.io
        </a>
        ，也可以直接翻 GitHub 仓库列表。
      </p>
    </Section>
  )
}
