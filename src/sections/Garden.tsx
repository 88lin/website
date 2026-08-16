/**
 * EXP.05 标本馆 · 还在跑的小站。
 *
 * 全站唯一一章「彩色底卡」：卡面直接铺三档浅彩底（蓝/黄/珊瑚的 soft 档），
 * 这是用户点名喜欢的设计系统语言。颜色绑在小站的「类」上——
 * 特效=珊瑚、工具=蓝、内容=黄、组件=墨，颜色是可读的信息不是装饰。
 * 每张卡按标本登记：拉丁位编号、名字、一句「为什么是它」、真链接。
 * 六张宽度刻意不齐（4/4/4 与 5/3/4），章尾一条墨色横幅收总账。
 */

import { ArrowOut } from '../components/Icons'
import { chapters, garden, gardenFeatured, gardenIntro, type GardenGroup } from '../content/site'
import { useStagger } from '../lib/motion'

const GROUP_TINT: Record<GardenGroup, 'coral' | 'blue' | 'yellow' | 'ink'> = {
  特效: 'coral',
  工具: 'blue',
  内容: 'yellow',
  组件: 'ink',
}

const countOf = (g: GardenGroup) => garden.filter((x) => x.group === g).length

const SPANS = [4, 4, 4, 5, 3, 4]

export function Garden() {
  const grid = useStagger<HTMLDivElement>(80)
  const ch = chapters.find((c) => c.id === 'garden')!

  return (
    <section id="garden" className="ch ch--garden" data-tone="alt" aria-labelledby="garden-h">
      <div className="wrap">
        <header className="ch-head">
          <s className="ch-no" aria-hidden="true">
            EXP.{ch.no}
          </s>
          <div className="ch-head__txt">
            <h2 id="garden-h">{gardenIntro.headline}</h2>
            <p>{gardenIntro.body}</p>
          </div>
        </header>

        <div className="spec-grid" ref={grid}>
          {gardenFeatured.map((it, i) => (
            <a
              className="spec"
              data-tint={GROUP_TINT[it.group]}
              key={it.name}
              href={it.href}
              target="_blank"
              rel="noreferrer noopener"
              data-stagger=""
              style={{ '--span': SPANS[i] } as React.CSSProperties}
            >
              <span className="spec__no" aria-hidden="true">
                SPEC.{String(i + 1).padStart(2, '0')}
              </span>
              <s className="spec__group">{it.group}</s>
              <h3>{it.name}</h3>
              <p>{it.why}</p>
              <span className="spec__go">
                打开小站 <ArrowOut />
              </span>
            </a>
          ))}
        </div>

        <a
          className="spec-hub"
          href={gardenIntro.hub}
          target="_blank"
          rel="noreferrer noopener"
        >
          <b>
            {gardenIntro.hubLabel} · 全部 {gardenIntro.total} 个小站
          </b>
          <span>
            另有 {gardenIntro.rest} 个未在此列出 —— 特效 {countOf('特效')} / 工具 {countOf('工具')} / 内容{' '}
            {countOf('内容')} / 组件 {countOf('组件')}，四类都在跑
          </span>
          <span className="spec-hub__go">
            88lin.github.io <ArrowOut />
          </span>
        </a>
      </div>
    </section>
  )
}
