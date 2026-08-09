/**
 * 04 案例。
 *
 * 三张整屏卡片 sticky 叠层，后一张推上来时把前一张压回底色里。sticky 写在 CSS，
 * JS 只做被压住那张的形变——这样禁用 JS 时它就是三段普通的长内容，不会白屏。
 *
 * 每张卡只讲一件事，按「背景 / 卡在哪 / 怎么解」三段走，右栏是能被第三方核到的
 * 四个数字，加一块手绘框里的取舍：**写清楚放弃了什么**，比列一堆功能有用。
 *
 * 不放封面图：三张封面在这个尺寸下只会变成三块彩色噪声，而且会把首屏之外的
 * 图片预算吃光。数字和字本身就是画面。
 */

import { Fragment, useCallback, useRef } from 'react'
import { Hand } from '../components/Hand'
import { ArrowOut } from '../components/Icons'
import { cases, casesIntro } from '../content/cases'
import { caseStack, useLazyScene, type SceneApi } from '../lib/motion'
import { Link } from '../router'

export function Cases() {
  const stackRef = useRef<HTMLDivElement | null>(null)

  const build = useCallback(({ gsap, root }: SceneApi) => {
    const cards = Array.from(root.querySelectorAll<HTMLElement>('.stack-card'))
    if (cards.length > 1) caseStack(gsap, cards)
  }, [])

  useLazyScene(stackRef, build)

  return (
    <section id="cases" className="ch ch-cases ch--open" data-tone="deep">
      <div className="wrap cases__head">
        <h2 className="hd">{casesIntro.headline}</h2>
        <p className="lede">{casesIntro.body}</p>
      </div>

      <div className="stack" ref={stackRef}>
        {cases.map((c) => (
          <div className="stack-card" key={c.slug}>
            <div className="wrap">
              <article className="case" data-tint={c.tone}>
                {/* 编号是纹理不是内容：5.5% 的墨色读不出来，也不该被读屏念出来 */}
                <span className="case__no num" data-no={c.no} aria-hidden="true" />

                <div className="case__main">
                  <div>
                    <h3 className="case__name">{c.name}</h3>
                    <span className="case__cn">{c.cn}</span>
                  </div>
                  <p className="case__claim">{c.claim}</p>
                  <dl className="case__secs">
                    {c.sections.map((s) => (
                      <div className="case__sec" key={s.label}>
                        <dt>{s.label}</dt>
                        <dd>{s.body}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="case__side">
                  <div className="case__figures">
                    {c.results.map((r) => (
                      <div className="figure" key={r.label}>
                        <b>{r.value}</b>
                        <span>{r.label}</span>
                      </div>
                    ))}
                  </div>

                  <Hand label="取舍" tone={c.tone} seed={c.slug}>
                    <div className="hand__in">
                      {c.tradeoffs.map((t) => (
                        <Fragment key={t.title}>
                          <h4>{t.title}</h4>
                          <p>{t.body}</p>
                        </Fragment>
                      ))}
                    </div>
                  </Hand>

                  <div className="case__links">
                    <Link className="btn" to={`/case/${c.slug}/`}>
                      读完整案例
                    </Link>
                    <a
                      className="btn btn--ghost"
                      href={c.repo}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      仓库
                      <ArrowOut />
                    </a>
                  </div>
                </div>
              </article>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
