import { useEffect, useMemo, useRef, useState } from 'react'
import { garden, gardenIntro, type GardenGroup } from '../content/site'
import { Eyebrow, Mark, Note } from '../components/ui'
import { fadeUp } from '../lib/motion'

/**
 * components.md #14 Filter 标签栏 + 胶囊标签流。
 *
 * 上一版这里是一块可拖动的均匀网格，41 个格子的 border-radius 计算值全是 0px。
 * 现在每一枚都是 999px 胶囊，筛选按钮也是胶囊，靠 aria-pressed 表达状态。
 */
const GROUPS: GardenGroup[] = ['特效', '工具', '内容', '组件']
type Filter = '全部' | GardenGroup

/** 名称越短给越大的字号，让标签流有呼吸感，而不是一排等高格子。 */
function sizeOf(name: string) {
  const n = [...name].length
  if (n <= 4) return 'l'
  if (n <= 6) return 'm'
  return 's'
}

export function Garden() {
  const root = useRef<HTMLElement>(null)
  const [filter, setFilter] = useState<Filter>('全部')

  const counts = useMemo(() => {
    const m = new Map<Filter, number>([['全部', garden.length]])
    GROUPS.forEach((g) => m.set(g, garden.filter((i) => i.group === g).length))
    return m
  }, [])

  const shown = filter === '全部' ? garden : garden.filter((i) => i.group === filter)

  useEffect(() => {
    if (!root.current) return
    fadeUp('.garden-fade', root.current, 0.07, 22)
  }, [])

  return (
    <section id="garden" ref={root} className="section-y bg-cream-dark">
      <div className="shell">
        <div className="garden-fade js-fade flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="max-w-[44ch]">
            <Eyebrow>Digital garden</Eyebrow>
            <h2 className="serif mt-4 text-d2">
              数字<Mark>花园</Mark>
            </h2>
            <p className="mt-5 text-lead text-ink-light">{gardenIntro.body}</p>
          </div>
          <p className="flex items-baseline gap-3">
            <span className="nums text-[clamp(2.4rem,4vw,3.4rem)] leading-none">
              {garden.length}
            </span>
            <span className="text-sm font-medium text-ink-light">个还活着的小页面</span>
          </p>
        </div>

        {/* 筛选栏：一排胶囊，active 用 --brand-surface + --on-brand */}
        <div
          className="garden-fade js-fade mt-[clamp(32px,4vw,52px)] flex flex-wrap items-center gap-2.5"
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
          <Note className="ml-1 hidden text-ink-faint sm:inline">全部都能点开</Note>
        </div>

        {/* 标签流：字号错落的胶囊，不是等宽网格 */}
        <ul className="garden-flow garden-fade js-fade mt-7">
          {shown.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer noopener"
                className="garden-pill inline-flex items-center"
                data-size={sizeOf(item.name)}
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
      </div>
    </section>
  )
}
