/**
 * 首页 · 实验志的八条实验。
 *
 * 章序是 site.ts 的 chapters 与 audit 的 CHAPTERS，三处一致。
 * 每章一种构图：封面星图 / 测量记录 / 交汇图 / 横推卡轨 / 粘性堆叠 /
 * 标本卡 / 分屏 / 收口——撞型即回炉。
 */

import { Nav } from '../components/Nav'
import { Hero } from '../sections/Hero'
import { Metrics } from '../sections/Metrics'
import { Craft } from '../sections/Craft'
import { Work } from '../sections/Work'
import { Cases } from '../sections/Cases'
import { Garden } from '../sections/Garden'
import { Notes } from '../sections/Notes'
import { Contact } from '../sections/Contact'

export function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <Metrics />
        <Craft />
        <Work />
        <Cases />
        <Garden />
        <Notes />
        <Contact />
      </main>
    </>
  )
}
