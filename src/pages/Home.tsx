/**
 * 首页 = 一台九格机架。
 *
 * 九格顺序即叙事顺序：先给论点（00），立刻给可核验的数（01），说清两条主线
 * （02），拿作品与案例证明（03/04），补上量的证据（05），交代工具与写作
 * （06/07），最后只留一个出口（08）。
 */

import { useEffect } from 'react'
import { Hero } from '../sections/Hero'
import { Metrics } from '../sections/Metrics'
import { Tracks } from '../sections/Tracks'
import { Works } from '../sections/Works'
import { Cases } from '../sections/Cases'
import { Garden } from '../sections/Garden'
import { Stack } from '../sections/Stack'
import { Writing } from '../sections/Writing'
import { Contact } from '../sections/Contact'
import { Strip } from '../components/Strip'
import { Foot } from '../components/Foot'
import { channels } from '../content/site'
import { bootChannelTracking } from '../lib/motion'

export function Home() {
  useEffect(() => bootChannelTracking(channels.map((c) => `ch-${c.no}`)), [])

  return (
    <>
      <main className="rack" id="main">
        <Hero />
        <Metrics />
        <Tracks />
        <Works />
        <Cases />
        <Garden />
        <Stack />
        <Writing />
        <Contact />
      </main>
      <Foot />
      <Strip />
    </>
  )
}
