/**
 * 首页。七章：开场 / 案例 / 主线 / 作品 / 标本馆 / 写作 / 联系。
 *
 * 章序把案例提到第 01 —— 招聘方与客户最想看的就是它，
 * 不该让人先滚过三章读数与主线。每章一种构图，撞型即回炉。
 */

import { Nav } from '../components/Nav'
import { ChapterRail } from '../components/ChapterRail'
import { Hero } from '../sections/Hero'
import { Cases } from '../sections/Cases'
import { Craft } from '../sections/Craft'
import { Work } from '../sections/Work'
import { Garden } from '../sections/Garden'
import { Notes } from '../sections/Notes'
import { Contact } from '../sections/Contact'

export function Home() {
  return (
    <>
      <Nav />
      <ChapterRail />
      <main id="main">
        <Hero />
        <Cases />
        <Craft />
        <Work />
        <Garden />
        <Notes />
        <Contact />
      </main>
    </>
  )
}
