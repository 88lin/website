/** 06 联系：巨号邮箱 + 渠道胶囊 + 微信二维码，压在一块淡紫面上。 */

import { Section } from '../components/Section'
import { AS_OF, CONTACT_EMAIL, CONTACT_HREF, contact, footer, profile } from '../content/site'
import { useStagger } from '../lib/motion'

export function Contact() {
  const ref = useStagger<HTMLDivElement>(60)

  return (
    <Section id="contact" title={contact.headline} intro={contact.body}>
      <div className="contact" ref={ref}>
        <b className="contact__ghost" aria-hidden="true">
          @{profile.handle}
        </b>

        <div className="contact__main">
          <p className="contact__k" data-stagger>
            写信到
          </p>

          <a className="mailto" href={CONTACT_HREF} data-stagger>
            {CONTACT_EMAIL}
            <i aria-hidden="true">→</i>
          </a>

          <ul className="chans" data-stagger>
            {contact.channels.map((c) => (
              <li key={c.id}>
                <a href={c.href} target="_blank" rel="noreferrer">
                  <b>{c.label}</b>
                  <span>{c.value}</span>
                  <i aria-hidden="true">↗</i>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <figure className="qr" data-stagger>
          <img
            src={contact.wechat.src}
            width={168}
            height={168}
            alt={`${profile.name} 的微信二维码`}
            loading="lazy"
            decoding="async"
          />
          <figcaption>
            <b>{contact.wechat.label}</b>
            <span>{contact.wechat.hint}</span>
          </figcaption>
        </figure>
      </div>

      <footer className="foot">
        <p>{footer.copyright}</p>
        <p className="foot__note">{footer.note}</p>
        <p className="foot__meta">
          <span>数字核实于 {AS_OF}</span>
        </p>
      </footer>
    </Section>
  )
}
