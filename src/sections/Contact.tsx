/**
 * 07 接入。
 *
 * 收束章：整屏只有一个巨型行动点，其余全部退成一列细线。前面七章都在证明
 * 「我做过什么」，这一章只需要回答「怎么找到你」——多一个元素都是干扰。
 *
 * 敞开章：底色是舞台上的 287° 场，和首屏同角度、方向反过来。线从这里出画。
 */

import { contact, footer } from '../content/site'
import { cssv } from '../lib/css'
import { ArrowOut } from '../components/Icons'

export function Contact() {
  return (
    <section
      id="contact"
      className="ch ch-contact ch--open"
      data-tone="berry"
      data-edge="fade"
      style={cssv({ '--bleed': 'var(--cream)' })}
    >
      <div className="wrap">
        <h2 className="hd">{contact.headline}</h2>
      </div>

      <div className="wrap contact__body">
        <div className="contact__lead">
          <p className="lede">{contact.body}</p>
          <a className="contact__mail" href={contact.primary.href}>
            {contact.primary.value}
            <ArrowOut />
          </a>
        </div>

        <ul className="contact__ch">
          {contact.channels.map((c) => (
            <li key={c.id}>
              <a href={c.href} target="_blank" rel="noreferrer noopener">
                {c.label}
                <em>{c.value}</em>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <footer className="wrap foot">
        <span>{footer.copyright}</span>
        <span>{footer.note}</span>
        <span>
          <a href={footer.source} target="_blank" rel="noreferrer noopener">
            本站源码
          </a>
        </span>
        <span className="tag">数据核实于 {footer.asOf}</span>
      </footer>
    </section>
  )
}
