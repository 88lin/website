import { useEffect, useRef } from 'react'
import { stack } from '../content/site'
import { Eyebrow } from '../components/ui'
import { fadeUp } from '../lib/motion'

/**
 * layouts.md #11 全宽品牌色面板。
 *
 * 这块的做法保留（整片出血色 + 四个技术簇 + 7/5/5/7 的不对称栅格），
 * 只把配色换成语义 token，标签全部改成胶囊。面板上不再叠白卡片，
 * 分隔靠 hairline，避免「卡片里套卡片」。
 */
const SPAN = ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-5', 'lg:col-span-7']

export function Stack() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!root.current) return
    fadeUp('.stack-cluster', root.current, 0.09, 26)
  }, [])

  return (
    <section id="stack" ref={root} className="section-y bg-brand-surface text-on-brand">
      <div className="shell">
        <div className="max-w-[46ch]">
          <Eyebrow tone="onBrand">Toolbox</Eyebrow>
          <h2 className="serif mt-4 text-d2 text-on-brand">{stack.headline}</h2>
          <p className="mt-5 text-lead text-on-brand">{stack.body}</p>
        </div>

        <div className="mt-[clamp(40px,5vw,68px)] grid grid-cols-12 gap-x-[clamp(24px,3vw,48px)] gap-y-[clamp(30px,3.4vw,46px)]">
          {stack.clusters.map((c, i) => (
            <div
              key={c.id}
              className={`stack-cluster rule-onBrand js-fade col-span-12 pt-6 ${SPAN[i]}`}
            >
              <div className="flex items-baseline gap-3">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-highlight" />
                <h3 className="serif text-[clamp(1.25rem,1.9vw,1.6rem)] leading-none text-on-brand">
                  {c.title}
                </h3>
                <span className="nums ml-auto text-sm text-on-brand">{c.items.length}</span>
              </div>
              <ul className="mt-5 flex flex-wrap gap-2">
                {c.items.map((s) => (
                  <li key={s} className="pill pill--onBrand">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
