import { hero, profile, META_AS_OF } from '../content/site'
import { Btn, Mark, Note } from '../components/ui'
import { Section } from '../components/Section'
import { TypeMatrix, type Slug } from '../components/TypeMatrix'

/**
 * Hero。
 *
 * 三行阶梯：第一行跨过基准线向左出血，第二行退回正文左缘，第三行再向右让开一步。
 * 版式的参照系是那条贯通全页的竖线，不是「左右两栏」。右侧那盘活字把主标题
 * 逐字排了出来——把前沿 AI 变成看得见的工程 · 茉灵——这是这一屏的记忆点，
 * 也是 3D 活字系统的 DOM 底层。
 */

/** 一格一字，正好排完主标题加上署名。着色遵循 60/30/10：纸色为主，墨色其次，
 *  荧光黄只给「看得见」三个字——和标题里的荧光笔是同一处强调。 */
const HERO_SLUGS: Slug[] = [
  { c: '把', t: 'ink' },
  { c: '前', t: 'paper' },
  { c: '沿', t: 'paper' },
  { c: 'A', t: 'ink' },
  { c: 'I', t: 'paper' },
  { c: '变', t: 'paper' },
  { c: '成', t: 'ink' },
  { c: '看', t: 'mark' },
  { c: '得', t: 'mark' },
  { c: '见', t: 'mark' },
  { c: '的', t: 'paper' },
  { c: '工', t: 'paper' },
  { c: '程', t: 'ink' },
  { c: '·', t: 'paper' },
  { c: '茉', t: 'brand' },
  { c: '灵', t: 'paper' },
]

/** 逐字切分在 SSR 阶段就完成，delay 写进 style —— 首帧布局即最终布局，CLS 为 0。 */
const STEP = 0.022
function chars(text: string, from: number) {
  return Array.from(text).map((ch, i) => (
    <span
      key={`${ch}-${i}`}
      className="hero-char"
      style={{ animationDelay: `${(0.02 + (from + i) * STEP).toFixed(3)}s` }}
    >
      {ch === ' ' ? '\u00A0' : ch}
    </span>
  ))
}

export function Hero() {
  const l1 = Array.from(hero.line1).length
  const l2 = Array.from(hero.line2Mark + hero.line2Post).length

  return (
    <Section
      id="top"
      tone="cream"
      label="档案 PROFILE"
      padTop="136px"
      padBottom="clamp(72px,10vh,124px)"
    >
      <div className="grid gap-[clamp(40px,5vw,72px)] lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="hero-fade flex items-center gap-3 text-sm text-ink-light">
            <Note className="text-[1.35rem] text-brand-deep">Hi,</Note>
            {/* 390px 上「中国 · 浙江」正好卡在断点上，会掉一个「江」下去成孤字 */}
            <span>
              {profile.role} · <span className="whitespace-nowrap">{profile.location}</span>
            </span>
          </p>

          {/* 三行阶梯。参照系是基准线：跨过去 → 回到线上 → 让开一步。 */}
          <h1 className="serif mt-6 text-d1">
            <span className="bleed-rail block">{chars(hero.line1, 0)}</span>
            <span className="block">
              <Mark>{chars(hero.line2Mark, l1)}</Mark>
              {chars(hero.line2Post, l1 + Array.from(hero.line2Mark).length)}
            </span>
            <span className="block ml-[clamp(30px,6.5vw,124px)]">{chars(hero.line3, l1 + l2)}</span>
          </h1>

          <p
            className="hero-fade mt-8 max-w-[44ch] text-lead text-ink-light"
            style={{ animationDelay: '0.42s' }}
          >
            {hero.sub}
          </p>

          {/* CTA 回到版心：基准线那条竖带留给标题出血和页边标签 */}
          <div
            className="hero-fade mt-9 flex flex-wrap items-center gap-3.5"
            style={{ animationDelay: '0.5s' }}
          >
            <Btn>{hero.primaryCta}</Btn>
            <Btn href="#work" variant="outline">
              {hero.secondaryCta}
            </Btn>
          </div>
        </div>

        <div className="lg:col-span-5">
          <TypeMatrix
            slugs={HERO_SLUGS}
            cols={4}
            anchor="hero"
            cssStagger={0.038}
            cssDelay={0.16}
          />
          <p
            className="hero-fade mt-6 text-[0.8125rem] font-medium tracking-wide text-ink-light"
            style={{ animationDelay: '0.62s' }}
          >
            @{profile.handle} · {profile.location} · {profile.since} 年至今
            <span className="ml-2.5 text-ink-faint">{META_AS_OF}</span>
          </p>
        </div>
      </div>

      {/* 右侧页边批注。左边是系统给的标签，右边是作者自己写的一句——
          一页稿子的两条边都用上了。 */}
      <p className="hero-latin hidden xl:block">{profile.latinTagline}</p>
    </Section>
  )
}
