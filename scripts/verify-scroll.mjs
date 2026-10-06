/** 平滑滚动与原生输入、动态布局、媒体偏好和 React 生命周期的回归。 */
import assert from 'node:assert/strict'
import { chromium, firefox } from 'playwright'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const fixture = `<!doctype html><html><head><style>body{margin:0;height:6000px}</style></head><body>
<script type="module">
  const { bootScroll } = await import('/src/lib/motion.ts');
  window.__abort = new AbortController();
  const pending = bootScroll(window.__abort.signal);
  if (location.search.includes('abort')) window.__abort.abort();
  window.__dispose = await pending;
  window.__ready = true;
</script></body></html>`
const server = await createServer({
  root, logLevel: 'error', server: { host: '127.0.0.1', port: 0 },
  plugins: [{ name: 'scroll-regression-fixture', configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!req.url.startsWith('/__scroll-test')) return next()
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(fixture)
    })
  } }],
})
let browser
let failures = 0
let passed = 0
try {
  await server.listen()
  const url = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await (process.env.SCROLL_BROWSER === 'firefox' ? firefox : chromium).launch({ executablePath: process.env.SCROLL_EXECUTABLE })
  const run = async (name, test, options = {}) => {
    if (process.env.SCROLL_CASE && !new RegExp(process.env.SCROLL_CASE).test(name)) return
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: options.reducedMotion })
    try {
      await context.route('**/*', route => new URL(route.request().url()).origin === url ? route.continue() : route.abort())
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
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
        window.__wheelListeners = listeners
      })
      await page.goto(url + (options.app ? '/' : `/__scroll-test${options.abort ? '?abort' : ''}`), { waitUntil: 'networkidle' })
      await page.waitForFunction(app => app ? document.documentElement.dataset.booted === '1' : window.__ready, Boolean(options.app))
      await page.mouse.move(40, 450)
      await test(page)
      assert.deepEqual(errors, [], '没有未处理的 JavaScript 异常')
      passed++
      console.log(`✓ ${name}`)
    } catch (error) {
      failures++
      console.error(`✗ ${name}: ${error.message}`)
    } finally { await context.close() }
  }
  const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const begin = async page => {
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }))
    await frames(page)
    await page.mouse.wheel(0, 600)
    await page.waitForTimeout(80)
  }

  await run('原生程序滚动能接管未结束的惯性', async page => {
    await begin(page)
    await page.evaluate(() => window.scrollTo({ top: 100, behavior: 'instant' }))
    await page.waitForTimeout(1200)
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - 100) < 1)
  })
  await run('小幅原生定位也不会被惯性覆盖', async page => {
    await begin(page)
    const target = await page.evaluate(() => {
      const top = scrollY + 1
      window.scrollTo({ top, behavior: 'instant' })
      return top
    })
    await page.waitForTimeout(1200)
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - target) < 1)
  })
  await run('键盘 Home 不被旧惯性覆盖', async page => {
    await begin(page)
    await page.keyboard.press('Home')
    await page.waitForTimeout(1200)
    assert.ok(await page.evaluate(() => scrollY) < 1)
  })
  await run('点击会中止页面惯性', async page => {
    await begin(page)
    await page.mouse.click(40, 450)
    const stopped = await page.evaluate(() => scrollY)
    await page.waitForTimeout(1200)
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - stopped) < 1)
  })
  await run('独立滚动区域接管时页面停止移动', async page => {
    await page.evaluate(() => {
      const el = document.createElement('div')
      el.id = 'native-region'
      el.style.cssText = 'position:fixed;top:180px;left:180px;width:200px;height:150px;overflow:auto'
      el.innerHTML = '<div style="height:1000px">scroll</div>'
      el.addEventListener('wheel', () => { window.__nestedStart = scrollY }, { capture: true, passive: true })
      document.body.append(el)
    })
    await begin(page)
    await page.mouse.move(220, 220)
    await page.mouse.wheel(0, 120)
    await page.waitForTimeout(1200)
    assert.ok(await page.$eval('#native-region', el => el.scrollTop) > 0)
    assert.ok(Math.abs(await page.evaluate(() => scrollY - window.__nestedStart)) < 1)
  })
  await run('布局缩短后不会沿用旧滚动边界', async page => {
    await page.evaluate(() => { document.body.style.height = '1300px' })
    await frames(page)
    await page.mouse.wheel(0, 1500)
    await page.waitForTimeout(110)
    await page.evaluate(() => { document.body.style.height = '6000px' })
    await page.waitForTimeout(1200)
    assert.ok(await page.evaluate(() => scrollY) <= 400)
  })
  await run('启用减少动态效果会移除平滑滚轮监听', async page => {
    await begin(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForFunction(() => window.__wheelListeners.size === 0, null, { timeout: 1500 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.waitForFunction(() => window.__wheelListeners.size === 1)
  })
  await run('初始减弱动效后恢复偏好也能启用滚动', async page => {
    assert.equal(await page.evaluate(() => window.__wheelListeners.size), 0)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.waitForFunction(() => window.__wheelListeners.size === 1, null, { timeout: 1500 })
  }, { reducedMotion: 'reduce' })
  await run('停止后延迟回调不会恢复旧滚动状态', async page => {
    await page.evaluate(() => window.scrollTo({ top: 100, behavior: 'instant' }))
    await frames(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForTimeout(600)
    assert.equal(await page.evaluate(() => window.__wheelListeners.size), 0)
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lenis')), false)
  })
  await run('中止异步初始化不留下监听', async page => {
    assert.equal(await page.evaluate(() => window.__wheelListeners.size), 0)
    await page.evaluate(() => window.__dispose())
  }, { abort: true })
  await run('SPA 导航不带入上一页的惯性', async page => {
    await page.waitForFunction(() => window.__wheelListeners.size === 1)
    await begin(page)
    await page.locator('.case__say a').first().evaluate(el => el.click())
    await page.waitForURL('**/case/**')
    await page.waitForTimeout(1500)
    assert.ok(await page.evaluate(() => scrollY) < 1)
    assert.equal(await page.evaluate(() => window.__wheelListeners.size), 1)
  }, { app: true })
  await run('横推轨不拦截滚轮修饰键', async page => {
    const prevented = await page.$eval('.rail', el => {
      el.scrollLeft = 200
      return ['ctrlKey', 'metaKey', 'altKey', 'shiftKey'].map(key => {
        const event = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true, [key]: true })
        el.dispatchEvent(event)
        return event.defaultPrevented
      })
    })
    assert.deepEqual(prevented, [false, false, false, false])
  }, { app: true })
  await run('横推轨接管旧惯性且到头后交回页面', async page => {
    await page.$eval('.rail', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await page.waitForTimeout(500)
    await page.$eval('.rail', el => { el.scrollLeft = 200 })
    await page.evaluate(() => document.body.dispatchEvent(new WheelEvent('wheel', { deltaY: 600, bubbles: true, cancelable: true })))
    await page.waitForTimeout(80)
    const stopped = await page.evaluate(() => {
      const y = scrollY
      const rail = document.querySelector('.rail')
      const left = rail.scrollLeft
      rail.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }))
      return { y, left }
    })
    await page.waitForTimeout(500)
    const after = await page.$eval('.rail', el => el.scrollLeft)
    assert.ok(after > stopped.left + 100, `横推轨应从输入时的位置前进，实际 ${stopped.left} → ${after}`)
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - stopped.y) < 1)
    await page.$eval('.rail', el => el.scrollTo({ left: el.scrollWidth, behavior: 'instant' }))
    await page.evaluate(() => document.querySelector('.rail').dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })))
    await page.waitForTimeout(1200)
    assert.ok(await page.evaluate(() => scrollY) > stopped.y + 80)
  }, { app: true })
  await run('自动横滚实时响应减少动态效果', async page => {
    await page.mouse.move(5, 5)
    await page.$eval('.rail', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await page.waitForTimeout(500)
    const read = () => page.$eval('.rail', el => el.scrollLeft)
    const start = await read()
    await page.waitForTimeout(600)
    assert.ok(await read() > start + 5, '正常偏好下正在自动横滚')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForTimeout(100)
    const stopped = await read()
    await page.waitForTimeout(600)
    assert.ok(Math.abs(await read() - stopped) < 1, '减少动态效果后应停止自动横滚')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.waitForTimeout(100)
    const resumed = await read()
    await page.waitForTimeout(600)
    assert.ok(await read() > resumed + 5, '恢复偏好后继续自动横滚')
  }, { app: true })
  await run('卸载后偏好变化和页面恢复不复活旧控制器', async page => {
    await page.evaluate(() => { window.__abort.abort(); window.__dispose() })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
    await page.waitForTimeout(100)
    assert.equal(await page.evaluate(() => window.__wheelListeners.size), 0)
  })
  await run('恢复自动横滚时仍尊重已有悬停和焦点', async page => {
    await page.locator('.rail').hover()
    const read = () => page.$eval('.rail', el => el.scrollLeft)
    for (const focused of [false, true]) {
      if (focused) {
        await page.locator('.rail').focus()
        await page.mouse.move(5, 5)
      }
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.waitForTimeout(100)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.waitForTimeout(100)
      const stopped = await read()
      await page.waitForTimeout(600)
      assert.ok(Math.abs(await read() - stopped) < 1, focused ? '保留焦点时不能自动滚动' : '仍在悬停时不能自动滚动')
    }
  }, { app: true })

  console.log(`滚动回归：${passed} 通过，${failures} 失败`)
} finally {
  if (browser) await browser.close()
  await server.close()
}
if (failures) process.exitCode = 1
