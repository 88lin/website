/* 02 案例：六条账目行，奇偶行整行镜像。 */

import { useCallback, useRef } from 'react'
import { Section } from '../components/Section'
import { cases, casesIntro } from '../content/cases'
import { Link } from '../router'
import { useLazyScene, useMediaQuery, useStagger, type SceneApi } from '../lib/motion'

export function Cases() {
  const stagger = useStagger<HTMLDivElement>(60)
  const scene = useRef<HTMLDivElement | null>(null)
  /* 视差只在三列版式（>1080px）上建。 */
  const wide = useMediaQuery('(min-width: 1081px)')

  /* 排字视差：巨号编号与账目表按不同速率走，差速才读作有厚度。 */
  const build = useCallback(({ gsap, root }: SceneApi) => {
    root.querySelectorAll<HTMLElement>('.case').forEach((row) => {
      const st = { trigger: row, start: 'top bottom', end: 'bottom top', scrub: 0.9 }
      const no = row.querySelector('.case__no')
      const led = row.querySelector('.ledger')
      if (no) gsap.fromTo(no, { y: 22 }, { y: -22, ease: 'none', scrollTrigger: st })
      if (led) gsap.fromTo(led, { y: -14 }, { y: 14, ease: 'none', scrollTrigger: st })
    })
  }, [])

  useLazyScene(scene, build, wide)

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
