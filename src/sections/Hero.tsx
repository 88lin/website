/**
 * 01 开场 · 两栏 + macOS 代码面板。
 *
 * v9 是五块「挤出来」的立体色块堆成的对角构图。用户对 v9 的判词是「整个页面
 * 配色我都不喜欢，太丑了」，而那些块体的暗侧正是 filter:brightness(.74) 压出来的
 * 「黑色」。v10 整套挤出机制作废，改用 88lin 自己设计系统的 hero 骨架：
 * 左文右物，两栏 minmax(0,1fr) / minmax(0,.84fr)。
 *
 * 右边那块是用户点名的 #5A macOS 代码面板，装的是 video_vip 真实在跑的降级配置。
 * 它是整页唯一的深色实体：一整页奶油底需要一个锚点，否则版面没有重量。
 *
 * 三条不让步的规则：
 *  1) 零位图。视觉重量由巨字、代码面板与真实数字扛，不靠截图。
 *  2) star / fork 不出现在这一章（全站只在 03 的作品卡上出现一次）。
 *  3) 三格读数全部由数组长度派生，不写死。
 */

import { useEffect, useRef, useState } from 'react'
import { CodeMac, type Tok } from '../components/CodeMac'
import { Circle } from '../components/Ink'
import { AS_OF, CONTACT_EMAIL, CONTACT_HREF, garden, hero, profile, projects, writing } from '../content/site'

/**
 * 面板里这几行是 video_vip 的真实规格，不是示意图：18 路解析接口可切换、
 * 出错退避两次后换下一路、22 个域名各一份适配器。案例 03 讲的就是它。
 */
const CODE: Tok[][] = [
  [{ t: '# 接口一定会挂，所以按「可切换」设计', c: 'cmt' }],
  [{ t: 'providers', c: 'kw' }, { t: ':' }],
  [{ t: '  - ' }, { t: 'primary', c: 'str' }, { t: '         # 默认A', c: 'cmt' }],
  [{ t: '  - ' }, { t: 'secondary', c: 'str' }, { t: '       # 七哥解析', c: 'cmt' }],
  [{ t: '  - ' }, { t: 'local', c: 'str' }, { t: '           # 共 18 路可切', c: 'cmt' }],
  [{ t: 'on_error', c: 'kw' }, { t: ':' }],
  [{ t: '  retry', c: 'kw' }, { t: ': ' }, { t: '2', c: 'num' }, { t: '            # 退避重试', c: 'cmt' }],
  [{ t: '  then', c: 'kw' }, { t: ': ' }, { t: 'next', c: 'fnc' }, { t: '         # 不猜最快，人一秒切', c: 'cmt' }],
  [{ t: 'hosts', c: 'kw' }, { t: ': ' }, { t: '22', c: 'num' }, { t: '            # 每域名一份适配器', c: 'cmt' }],
  [{ t: 'cache', c: 'kw' }, { t: ':' }],
  [{ t: '  ttl', c: 'kw' }, { t: ': ' }, { t: '600', c: 'num' }, { t: '           # 解析结果只留十分钟', c: 'cmt' }],
  [{ t: 'report', c: 'kw' }, { t: ': ' }, { t: 'issue', c: 'fnc' }, { t: '        # 挂了开 issue，不私聊', c: 'cmt' }],
]

const num = (n: number) => n.toLocaleString('en-US')

/** 三格读数。全部由数据派生：站点数、在维护的项目数、建站天数。 */
const PILLS = [
  { v: String(garden.length), k: 'SITES ONLINE' },
  { v: String(projects.length), k: 'MAINTAINED' },
  { v: num(writing.days), k: 'DAYS RUNNING' },
]

export function Hero() {
  const [done, setDone] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
    } catch {
      return // 不支持或没授权就静默失败：邮箱本来就明文摆在那儿，手选也能复制
    }
    setDone(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDone(false), 1600)
  }

  return (
    <section id="hero" className="ch ch--hero" data-tone="paper" aria-labelledby="hero-h">
      <div className="hero-in">
        <div className="hero-copy">
          <a
            className="label-caps"
            href="https://github.com/88lin"
            target="_blank"
            rel="noreferrer noopener"
          >
            {hero.latin}
          </a>

          <h1 className="hero-h1" id="hero-h">
            <i>{hero.line1}</i>
            <i>
              {hero.line2Pre}
              <span className="hl-yellow">{hero.line2Mark}</span>
              {hero.line2Mid}
              <Circle seed="hero-keep">{hero.line2Circle}</Circle>
            </i>
            <i>{hero.line3}</i>
          </h1>

          <p className="hero-lead">{profile.latinTagline}</p>
          <p className="hero-sub">{hero.sub}</p>

          {/* 整页唯一真正想让人带走的字符串，给它一键复制比再放一个按钮实用 */}
          <div className="hero-cmd">
            <span className="hero-cmd__p" aria-hidden="true">
              mail:
            </span>
            <code>{CONTACT_EMAIL}</code>
            <button
              className="hero-cmd__copy"
              type="button"
              onClick={copy}
              data-done={done ? '1' : undefined}
            >
              {done ? 'COPIED' : 'COPY'}
            </button>
          </div>

          <div className="hero-act">
            <a className="cta-btn" href={CONTACT_HREF}>
              {hero.primaryCta}
            </a>
            <a className="cta-btn cta-btn--ghost" href="#cases">
              {hero.secondaryCta}
            </a>
          </div>

          <div className="hero-pills">
            {PILLS.map((p) => (
              <div className="hero-pill" key={p.k}>
                <b>{p.v}</b>
                <s>{p.k}</s>
              </div>
            ))}
          </div>

          <p className="hero-src">
            数据取自 GITHUB 公开接口与博客统计条，截至 {AS_OF}
          </p>
        </div>

        <div className="hero-visual">
          <p className="hero-visual__cap">
            <span>FALLBACK BY DESIGN</span>
            <span>88lin/video_vip</span>
          </p>
          <CodeMac file="resilience.yml" code={CODE} />
        </div>
      </div>
    </section>
  )
}
