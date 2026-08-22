/**
 * 01 案例。四个深度案例，一行一个。
 *
 * 首页只放论点 + 摘要 + 实测数字；背景 / 卡在哪 / 怎么解 / 取舍留在案例子页。
 * 这个分工从 v12 起没变，理由也没变：四段全文铺在首页没人看得完。
 *
 * 版式换掉了。上一版是「四行 × 同一张虚线数据面板」，被判「模板化、越往下越普通」
 * ——判得对：同一个盒子连排四遍，第二遍起就没有信息了，只剩节奏。
 *
 * 这一版整章**一个盒子都没有**：
 *  · 每条案例是一条账目行，靠 1px 细线分隔，不靠卡片分隔
 *  · 左侧一条编号轨：巨号编号 + 项目名，编号在行内 sticky，跟着读者走
 *  · 右侧实测数字排成带虚线引线的账目表（目录/发票的排法），不是又一个卡
 *  · 数字出处收进 <details>，想核的人点开，一行一条
 *  · 奇偶行左右互换，节奏是交替的而不是重复的
 *
 * 数字出处没有删，只是折起来了。可核验是这个站的底线。
 */

import { useCallback, useRef } from 'react'
import { Section } from '../components/Section'
import { cases, casesIntro } from '../content/cases'
import { Link } from '../router'
import { useLazyScene, useStagger, type SceneApi } from '../lib/motion'

export function Cases() {
  const stagger = useStagger<HTMLDivElement>(60)
  const scene = useRef<HTMLDivElement | null>(null)

  /**
   * 排字视差：巨号编号与账目表按不同速率走，差速才读作有厚度。
   * 幅度压在 ±22px / ∓14px——再大就开始像 PPT 转场。
   */
  const build = useCallback(({ gsap, root }: SceneApi) => {
    root.querySelectorAll<HTMLElement>('.case').forEach((row) => {
      const st = { trigger: row, start: 'top bottom', end: 'bottom top', scrub: 0.9 }
      const no = row.querySelector('.case__no')
      const led = row.querySelector('.ledger')
      if (no) gsap.fromTo(no, { y: 22 }, { y: -22, ease: 'none', scrollTrigger: st })
      if (led) gsap.fromTo(led, { y: -14 }, { y: 14, ease: 'none', scrollTrigger: st })
    })
  }, [])

  useLazyScene(scene, build)

  return (
    <Section id="cases" title={casesIntro.headline} intro={casesIntro.body}>
      <div className="cases" ref={scene}>
        <div className="cases__in" ref={stagger}>
          {cases.map((c, i) => (
            <article
              className="case"
              data-t={c.tint}
              data-flip={i % 2 === 1 ? '1' : undefined}
              key={c.slug}
            >
              <div className="case__idx" data-stagger>
                <b className="case__no">{c.no}</b>
                <p className="case__name">{c.name}</p>
                <p className="case__cn">{c.cn}</p>
                <p className="case__year">{c.year}</p>
              </div>

              <div className="case__say" data-stagger>
                <h3 className="case__claim">{c.claim}</h3>
                <p className="case__sum">{c.summary}</p>
                <p className="case__stack">{c.stackLine}</p>

                <div className="case__acts">
                  <Link className="btn btn--blue" to={`/case/${c.slug}/`}>
                    看完整案例
                    <i aria-hidden="true">→</i>
                  </Link>
                  {c.link && (
                    <a className="btn btn--ghost" href={c.link} target="_blank" rel="noreferrer">
                      {c.linkLabel ?? '在线体验'} ↗
                    </a>
                  )}
                  <a className="btn btn--ghost" href={c.repo} target="_blank" rel="noreferrer">
                    源码 ↗
                  </a>
                </div>
              </div>

              <div className="case__data" data-stagger>
                <p className="case__dh">实测</p>
                <ul className="ledger">
                  {c.results.map((r) => (
                    <li key={r.label}>
                      <span>{r.label}</span>
                      {/* 引线。空元素在 align-items: baseline 的 flex 里，
                          基线就是它的下边缘，所以这条点线正好落在文字基线上。 */}
                      <i aria-hidden="true" />
                      <b>{r.value}</b>
                    </li>
                  ))}
                </ul>

                <details className="prov">
                  <summary>
                    数字出处 · {c.provenance.length} 条
                    <i aria-hidden="true" />
                  </summary>
                  <div className="prov__body">
                    {c.provenance.map((p) => (
                      <p className="prow" key={p.value}>
                        <b>{p.value}</b>
                        <span>{p.from}</span>
                      </p>
                    ))}
                  </div>
                </details>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Section>
  )
}
