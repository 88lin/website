/* 找出 G17 报的 #1C273C 到底是谁：定位含指定文本的节点，打印它到根的背景栈 */
import { chromium } from 'playwright'
import { serveDist } from './lib/serve.mjs'

const DIST = new URL('../dist/', import.meta.url).pathname
const { server, url } = await serveDist({ dist: DIST, port: 4242 })
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })

for (const route of ['', 'case/video-vip/']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  await page.goto(url + route, { waitUntil: 'load' })
  await page.waitForTimeout(1200)
  const out = await page.evaluate(() => {
    const hits = []
    for (const el of document.querySelectorAll('span, code, pre')) {
      const t = (el.textContent || '').trim()
      if (!/默认A|七哥解析|冰豆解析/.test(t) || el.children.length) continue
      const chain = []
      let n = el
      while (n && n !== document.documentElement) {
        const cs = getComputedStyle(n)
        chain.push(
          `${(n.className || n.tagName).toString().split(' ')[0]}[bg=${cs.backgroundColor}${cs.backgroundImage !== 'none' ? ' img=' + cs.backgroundImage.slice(0, 46) : ''}${cs.opacity !== '1' ? ' op=' + cs.opacity : ''}]`,
        )
        n = n.parentElement
      }
      hits.push(`"${t.slice(0, 10)}" ← ${chain.join(' ← ')}`)
      if (hits.length >= 2) break
    }
    return hits
  })
  console.log(`\n── ${route || '/'}`)
  for (const h of out) console.log('   ' + h)
  await page.close()
}
await browser.close()
server.close()
