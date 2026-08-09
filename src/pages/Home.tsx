/**
 * 首页。八章 + 一列锚点，页面本身没有任何逻辑。
 *
 * 唯一在这里做的事是启动章跟踪：谁占住视口 42% 那条线，谁就是当前章。
 * 这个信号同时喂给右侧锚点栏、舞台的双色场与织带——三者永远说同一件事。
 */

import { useEffect } from 'react'
import { Rail } from '../components/Rail'
import { Hero } from '../sections/Hero'
import { Metrics } from '../sections/Metrics'
import { Tracks } from '../sections/Tracks'
import { Works } from '../sections/Works'
import { Cases } from '../sections/Cases'
import { Garden } from '../sections/Garden'
import { Writing } from '../sections/Writing'
import { Contact } from '../sections/Contact'
import { chapters } from '../content/site'
import { bootChapterTracking } from '../lib/motion'

export function Home() {
  useEffect(() => bootChapterTracking(chapters.map((c) => c.id)), [])

  return (
    <>
      <main id="main">
        <Hero />
        <Metrics />
        <Tracks />
        <Works />
        <Cases />
        <Garden />
        <Writing />
        <Contact />
      </main>
      <Rail />
    </>
  )
}
