/**
 * 06 联系。收口。
 *
 * 邮箱是这一页真正的出口，所以把它排成整章最大的一行等宽字，点了就是 mailto。
 * 渠道做成一排胶囊。页脚写清「每个数字都来自公开接口、源码开源」与核实日期 ——
 * 这不是免责声明，是这一页的立场。
 *
 * 蓝块右侧压一个巨号 @88lin 衬底：上一版这块是一片空蓝，右下角大片死面。
 * 衬底用的是白色低透明度而不是深色 —— 饱和面上压深色会发脏，
 * 这条和投影那条是同一个道理。
 */

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

      <footer className="foot">
        <p>{footer.copyright}</p>
        <p className="foot__note">{footer.note}</p>
        <p className="foot__meta">
          <a href={footer.source} target="_blank" rel="noreferrer">
            本站源码 ↗
          </a>
          <span>数字核实于 {AS_OF}</span>
        </p>
      </footer>
    </Section>
  )
}
