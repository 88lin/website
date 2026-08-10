/**
 * 05 在写 · 精选缩略图 + 分组横滚。
 *
 * v6 这一章是 40 个标签胶囊平铺三行加一大片空白，用户的原话是
 * 「很普通的页面，像古老的网站一样」——那确实就是 2008 年的 tag cloud。
 *
 * 换掉的方式不是加装饰，是**换组件形态**：
 *  1) 能抓到真实截图的六项升为精选图墙，跨度 7/5、5/7、6/6，不是三等分。
 *  2) 抓不出内容的（纯 canvas 特效那一组 14 项）不放占位图，改成编号磁贴，
 *     按组横向 snap。宁可只给名字，也不塞假图。
 *  3) 博客不再用「计数除以最大值」的条形图假装数据可视化，
 *     改成一张真实的博客截图加最新六篇的实际标题与日期。
 */

import { ArrowOut } from '../components/Icons'
import { Shot } from '../components/Shot'
import {
  garden,
  gardenCovers,
  gardenFeatured,
  gardenIntro,
  writing,
  type GardenGroup,
} from '../content/site'
import { useStagger } from '../lib/motion'

/** 精选六项的版面跨度与裁切比：等宽等高就是一张表格。 */
const CELL = [
  { span: 7, ratio: '16 / 9', tint: 'blue' },
  { span: 5, ratio: '4 / 3', tint: 'yellow' },
  { span: 5, ratio: '4 / 3', tint: 'coral' },
  { span: 7, ratio: '16 / 9', tint: 'blue' },
  { span: 6, ratio: '3 / 2', tint: 'yellow' },
  { span: 6, ratio: '3 / 2', tint: 'coral' },
]

const GROUPS: { g: GardenGroup; tint: string; note: string }[] = [
  { g: '特效', tint: 'coral', note: '纯 canvas，截图抓不出内容，只给名字' },
  { g: '工具', tint: 'blue', note: '打开就能用，不用注册' },
  { g: '内容', tint: 'yellow', note: '影视、短剧、电台、图集' },
  { g: '组件', tint: 'blue', note: '嵌进 Notion 页面的小挂件' },
]

const featured = gardenFeatured
  .map((name) => garden.find((g) => g.name === name))
  .filter((g): g is NonNullable<typeof g> => Boolean(g))

export function Notes() {
  const wall = useStagger<HTMLDivElement>(70)

  return (
    <section id="notes" className="ch ch--notes" data-tone="paper" aria-labelledby="notes-h">
      <div className="wrap">
        <p className="eyebrow">GARDEN &amp; BLOG</p>
        <h2 className="ch-title" id="notes-h">
          {gardenIntro.headline}
        </h2>
        <p className="ch-lede">{gardenIntro.body}</p>

        <div className="gwall" ref={wall}>
          {featured.map((it, i) => (
            <a
              className="gwall__i rise"
              data-stagger=""
              key={it.name}
              href={it.href}
              target="_blank"
              rel="noreferrer noopener"
              data-tint={CELL[i].tint}
              style={{ gridColumn: `span ${CELL[i].span}` }}
            >
              <Shot
                cover={gardenCovers[it.name]}
                alt={`${it.name} 页面截图`}
                ratio={CELL[i].ratio}
                sizes="(max-width: 900px) 92vw, 40vw"
              />
              <span className="gwall__c">
                <span className="gwall__n">{it.name}</span>
                <ArrowOut />
              </span>
            </a>
          ))}
        </div>

        {GROUPS.map(({ g, tint, note }) => {
          const items = garden.filter((x) => x.group === g && !gardenFeatured.includes(x.name))
          if (!items.length) return null
          return (
            <div className="gset" data-tint={tint} key={g}>
              <div className="gset__hd">
                <h3>{g}</h3>
                <span className="gset__n">{items.length}</span>
                <p className="gset__note">{note}</p>
              </div>
              <ul className="gset__strip">
                {items.map((it, i) => (
                  <li key={it.name}>
                    <a href={it.href} target="_blank" rel="noreferrer noopener">
                      <span className="gset__i">{String(i + 1).padStart(2, '0')}</span>
                      <span className="gset__t">{it.name}</span>
                      <ArrowOut />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}

        <hr className="hair gsep" />

        <div className="blog">
          <a className="blog__shot" href={writing.href} target="_blank" rel="noreferrer noopener">
            <Shot
              cover="blog"
              alt="个人博客首页截图"
              ratio="16 / 10"
              sizes="(max-width: 900px) 92vw, 40vw"
            />
          </a>
          <div className="blog__say">
            <h3 className="blog__h">{writing.headline}</h3>
            <p className="blog__b">{writing.body}</p>
            <dl className="blog__nums">
              <div>
                <dt>文章</dt>
                <dd>{writing.posts}</dd>
              </div>
              <div>
                <dt>建站天数</dt>
                <dd>{writing.days.toLocaleString('en-US')}</dd>
              </div>
              <div>
                <dt>标签</dt>
                <dd>{writing.tagTotal}</dd>
              </div>
            </dl>
            <ul className="blog__list">
              {writing.latest.map((p) => (
                <li key={p.title}>
                  <span>{p.title}</span>
                  <time dateTime={p.date}>{p.date}</time>
                </li>
              ))}
            </ul>
            <ul className="blog__tags">
              {writing.tags.map((t) => (
                <li className="chip" key={t.name}>
                  {t.name}
                  <b>{t.count}</b>
                </li>
              ))}
            </ul>
            <a className="btn btn--ghost" href={writing.href} target="_blank" rel="noreferrer noopener">
              {writing.hrefLabel} <ArrowOut />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
