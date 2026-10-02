/** 开发模式 StrictMode 的异步资源生命周期回归。 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const server = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } })
let browser
try {
  await server.listen()
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`
  browser = await chromium.launch()
  for (const failedImport of [false, true]) {
    const context = await browser.newContext()
    try {
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.addInitScript(() => {
        const listeners = new Set()
        const add = EventTarget.prototype.addEventListener
        const remove = EventTarget.prototype.removeEventListener
        EventTarget.prototype.addEventListener = function (type, listener, options) {
          if (this === window && type === 'wheel') listeners.add(listener)
          return add.call(this, type, listener, options)
        }
        EventTarget.prototype.removeEventListener = function (type, listener, options) {
          if (this === window && type === 'wheel') listeners.delete(listener)
          return remove.call(this, type, listener, options)
        }
        window.__windowWheelListeners = listeners
      })
      let blocked = 0
      if (failedImport) await context.route(/gsap_ScrollTrigger\.js/, (route) => { blocked++; return route.abort('failed') })
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.waitForFunction(() => document.documentElement.dataset.booted === '1')
      if (failedImport) {
        assert.ok(blocked > 0, '故障注入必须命中实际的动态依赖')
        assert.equal(await page.evaluate(() => window.__windowWheelListeners.size), 0)
        await page.evaluate(() => window.scrollTo(0, 600))
        await page.waitForFunction(() => scrollY > 100)
      } else {
        await page.waitForFunction(() => window.__windowWheelListeners.size === 1)
        await page.locator('.case__say a').first().click()
        await page.locator('.cpage__back a').click()
        assert.equal(await page.evaluate(() => window.__windowWheelListeners.size), 1, '导航不累积滚轮监听')
      }
      assert.deepEqual(errors, [], '没有未处理的异步异常')
      console.log(`✓ ${failedImport ? '动态依赖失败后保留原生滚动' : 'StrictMode 和页面切换仅保留一个平滑滚动实例'}`)
    } finally { await context.close() }
  }
} finally {
  if (browser) await browser.close()
  await server.close()
}
