/* 01 服务：六件可以直接开工的活，两栏分栏清单 + 三步流程带。 */

import { Section } from '../components/Section'
import { services, servicesFlow, servicesIntro, cooperationQuestions, CONTACT_HREF, CTA_LABEL } from '../content/site'
import { useStagger } from '../lib/motion'

export function Services() {
  const ref = useStagger<HTMLDivElement>(55)

  return (
    <Section id="services" title={servicesIntro.headline} intro={servicesIntro.body}>
      <div ref={ref}>
        <p className="svc-note" data-stagger>
          <b>{servicesIntro.priceLabel}</b>
          <span>{servicesIntro.priceNote}</span>
        </p>

        <div className="svc">
          {services.map((s) => (
            <article id={`service-${s.id}`} className="svc__item" data-t={s.tint} key={s.id} data-stagger>
              <b className="svc__no" aria-hidden="true">
                {s.no}
              </b>

              <div className="svc__body">
                <h3 className="svc__t">{s.title}</h3>
                <p className="svc__b">{s.body}</p>

                <ul className="svc__does">
                  {s.does.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>

                <dl className="svc__meta">
                  <dt>交付</dt>
                  <dd>{s.deliver}</dd>
                  <dt>适合</dt>
                  <dd>{s.fit}</dd>
                </dl>
              </div>
            </article>
          ))}
        </div>

        <div className="flow" data-stagger>
          <h3 className="flow__h">怎么开始</h3>
          <ol className="flow__ol">
            {servicesFlow.map((f) => (
              <li key={f.no}>
                <b>{f.no}</b>
                <h4>{f.title}</h4>
                <p>{f.body}</p>
              </li>
            ))}
          </ol>
          <a className="btn btn--blue flow__cta" href={CONTACT_HREF}>
            {CTA_LABEL}
            <i aria-hidden="true">→</i>
          </a>
        </div>
        <section className="cooperation" aria-labelledby="cooperation-title">
          <h3 id="cooperation-title">合作前先看</h3>
          {cooperationQuestions.map((item) => (
            <details className="prov" key={item.question}>
              <summary><i aria-hidden="true" />{item.question}</summary>
              <p className="prov__body">{item.answer}</p>
            </details>
          ))}
        </section>
      </div>
    </Section>
  )
}
