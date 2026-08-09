/**
 * CH.00 总线。
 *
 * 不做居中大标题。字压在左边、贴着导轨起排，右边在机身上开一个洞——
 * 洞里是真的那台机器（实时场景，或者构建期从同一台机器截下来的图版）。
 * 视线的落点因此是偏的：先撞上左边那三行字，再被右边那束光带走。
 */

import { Bay, Lamp } from '../components/Bay'
import { Reveal } from '../components/Reveal'
import { MarkCircle, MarkUnder } from '../components/Annot'
import { IconDown, IconSignal } from '../components/Icons'
import { AS_OF, CONTACT_HREF, channels, hero, profile } from '../content/site'
import { scrollToId } from '../lib/motion'

const ch = channels[0]

export function Hero() {
  return (
    <Bay
      ch={ch}
      className="hero"
      win={{ x: '70%', y: '6%', w: '26%', h: '31%', tag: 'LENS · LIVE', plate: 'ch-00', eager: true }}
    >
      <div className="hero__grid">
        <div>
          <p className="hero__id">
            <Lamp state="live" live />
            <span className="silk-label">{hero.latin}</span>
          </p>

          <Reveal v="shutter" as="h1" id="ch-00-t" className="hero-line hero__type">
            <span style={{ ['--d' as string]: '0ms' }}>{hero.line1}</span>
            <span style={{ ['--d' as string]: '110ms' }}>
              {hero.line2Pre}
              <MarkUnder>{hero.line2Mark}</MarkUnder>
              {hero.line2Mid}
              <MarkCircle k="hero-weihu">{hero.line2Circle}</MarkCircle>
              {hero.line2Post}
            </span>
            <span style={{ ['--d' as string]: '220ms' }}>{hero.line3}</span>
          </Reveal>

          <p className="hero__sub">{hero.sub}</p>

          <div className="hero__acts">
            <a className="btn" href={CONTACT_HREF}>
              <IconSignal />
              {hero.primaryCta}
            </a>
            <button className="btn btn--ghost" type="button" onClick={() => scrollToId('ch-04')}>
              <IconDown />
              {hero.secondaryCta}
            </button>
          </div>
        </div>

        <dl className="hero__meta">
          <div>
            <dt>身份</dt>
            <dd>{profile.role}</dd>
          </div>
          <div>
            <dt>坐标</dt>
            <dd>{profile.location}</dd>
          </div>
          <div>
            <dt>在线自</dt>
            <dd className="num">{profile.githubSince}</dd>
          </div>
          <div>
            <dt>数据核实</dt>
            <dd className="num">{AS_OF}</dd>
          </div>
        </dl>
      </div>
    </Bay>
  )
}
