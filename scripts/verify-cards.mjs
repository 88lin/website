/** 卡片交互回归：检查实际绘制层、指针收尾与手动滚动后的恢复位置。 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { serveDist } from './lib/serve.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const production = process.argv.includes('--dist')
let server, url
if (production) {
  const preview = await serveDist({ dist: fileURLToPath(new URL('../dist/', import.meta.url)), port: 0 })
  server = preview.server
  url = preview.url
} else {
  server = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } })
  await server.listen()
  url = `http://127.0.0.1:${server.httpServer.address().port}/`
}
const browser = await chromium.launch()
let failures = 0
const only = process.env.CARD_CHECK

async function check(name, run, options = {}) {
  if (only && !name.includes(only)) return
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    await run(page, context)
    assert.deepEqual(errors, [], '没有浏览器运行异常')
    console.log(`✓ ${name}`)
  } catch (error) {
    failures++
    console.error(`✗ ${name}: ${error.message}`)
  } finally {
    await context.close()
  }
}

async function center(page, selector) {
  await page.locator(selector).evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await page.waitForTimeout(600)
}

async function dragDeck(page, dx = -180) {
  const deck = page.locator('.deck__stack')
  await deck.focus()
  await center(page, '.deck__stack')
  const box = await deck.boundingBox()
  const x = box.x + box.width * .55, y = box.y + box.height * .4
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y, { steps: 12 })
  return box
}

try {
  for (const width of [1440, 390]) {
    await check(`${width}px · 每张卡双向拖动时露出真实内容，循环与圆点一致`, async page => {
      const dots = page.locator('.deck__dots button')
      const names = await dots.evaluateAll(els => els.map(el => el.getAttribute('aria-label')))
      for (let i = 0; i < names.length; i++) {
        for (const direction of [-1, 1]) {
          await dots.nth(i).evaluate(el => el.click())
          await page.waitForTimeout(550)
          const box = await dragDeck(page, direction * 180)
          const painted = await page.evaluate(({ box, direction }) => {
            // 命中测试临时包含背卡；只改 pointer-events，不改变绘制顺序。
            const style = document.createElement('style')
            style.textContent = '.dcard, .dcard::after { pointer-events: auto !important; }'
            document.head.append(style)
            const x = direction < 0 ? box.x + box.width - 65 : box.x + 105
            const hit = document.elementFromPoint(x, box.y + box.height * .4)?.closest('.dcard')
            const result = hit?.querySelector('.dcard__claim')?.textContent
            const expected = document.querySelector('.dcard[data-slot="1"] .dcard__claim')?.textContent
            style.remove()
            return { result, expected }
          }, { box, direction })
          assert.equal(painted.result, painted.expected, `${names[i]} 拖动时被其他卡的空白遮罩覆盖`)
          await page.mouse.up()
          await page.waitForTimeout(550)
          const next = (i + (direction < 0 ? 1 : -1) + names.length) % names.length
          assert.equal(await page.locator('.dcard[data-slot="0"] .dcard__spine').textContent(), names[next])
          assert.equal(await dots.nth(next).getAttribute('aria-selected'), 'true')
          assert.equal(await page.locator('.dcard[data-slot="0"] .dcard__go').count(), 1)
        }
      }
    }, { viewport: { width, height: 1000 } })
  }

  await check('叠卡 · 外部松手后再次悬停不会继续拖动', async page => {
    await center(page, '.deck__stack')
    const deck = page.locator('.deck__stack')
    const before = await deck.getAttribute('aria-label')
    const box = await deck.boundingBox()
    await page.mouse.move(box.x + 120, box.y + 12)
    await page.mouse.down()
    await page.mouse.move(box.x + 120, box.y - 40)
    await page.mouse.up()
    await page.mouse.move(box.x + 220, box.y + 120)
    assert.equal(await deck.getAttribute('data-dragging'), null)
    assert.equal(await deck.getAttribute('aria-label'), before)
  })

  await check('叠卡 · 拖动后可用 Enter 打开当前案例', async page => {
    await dragDeck(page)
    await page.mouse.up()
    await page.waitForTimeout(550)
    const link = page.locator('.dcard[data-slot="0"] .dcard__go')
    const href = await link.getAttribute('href')
    await link.focus()
    await page.keyboard.press('Enter')
    await page.waitForURL(new URL(href, url).href, { timeout: 2500 })
    assert.equal(await page.locator('.cpage__claim').isVisible(), true)
  })

  await check('叠卡 · 从链接上起拖仍可翻页，普通点击仍可进入案例', async page => {
    await center(page, '.deck__stack')
    const deck = page.locator('.deck__stack')
    const before = await deck.getAttribute('aria-label')
    const link = page.locator('.dcard[data-slot="0"] .dcard__go')
    const box = await link.boundingBox()
    await page.mouse.move(box.x + 45, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x - 100, box.y + box.height / 2, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(550)
    assert.notEqual(await deck.getAttribute('aria-label'), before)
    assert.equal(new URL(page.url()).pathname, new URL(url).pathname, '拖动不应触发链接跳转')
    const href = await link.getAttribute('href')
    await link.click()
    await page.waitForURL(new URL(href, url).href, { timeout: 2500 })
  })

  await check('作品横轨 · 手动翻页后自动滚动从当前位置继续', async page => {
    await page.mouse.move(8, 8)
    await center(page, '#work')
    await page.getByRole('button', { name: '下一张', exact: true }).click()
    await page.waitForTimeout(700)
    const manual = await page.locator('.rail').evaluate(el => el.scrollLeft)
    assert.ok(manual > 200, '手动翻页确实移动了轨道')
    await page.mouse.move(8, 8)
    await page.waitForTimeout(2300)
    const resumed = await page.locator('.rail').evaluate(el => el.scrollLeft)
    assert.ok(resumed >= manual && resumed < manual + 120, `恢复位置不应跳回：${manual} → ${resumed}`)
  })

  await check('作品横轨 · 外部松手后再次悬停不会继续拖动', async page => {
    await center(page, '#work')
    const rail = page.locator('.rail')
    const box = await rail.boundingBox()
    await page.mouse.move(box.x + 170, box.y + 12)
    await page.mouse.down()
    await page.mouse.move(box.x + 170, box.y - 40)
    await page.mouse.up()
    const before = await rail.evaluate(el => el.scrollLeft)
    await page.mouse.move(box.x + 80, box.y + 120)
    assert.equal(await rail.getAttribute('data-grab'), null)
    assert.ok(Math.abs(await rail.evaluate(el => el.scrollLeft) - before) < 5)
  })

  await check('作品横轨 · 从源码链接上起拖仍可横移', async page => {
    await center(page, '#work')
    const rail = page.locator('.rail')
    await rail.hover()
    const box = await page.locator('.wcard__links a').first().boundingBox()
    const before = await rail.evaluate(el => el.scrollLeft)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 - 160, box.y + box.height / 2, { steps: 12 })
    await page.mouse.up()
    assert.ok(await rail.evaluate(el => el.scrollLeft) > before + 100, '链接原生拖放不应截断横移')
  })

  await check('作品横轨 · 键盘焦点保留时移开鼠标仍暂停', async page => {
    await center(page, '#work')
    const rail = page.locator('.rail')
    await rail.focus()
    const box = await rail.boundingBox()
    await page.mouse.move(box.x + 180, box.y + 120)
    await page.mouse.move(8, 8)
    const before = await rail.evaluate(el => el.scrollLeft)
    await page.waitForTimeout(500)
    assert.ok(Math.abs(await rail.evaluate(el => el.scrollLeft) - before) < 3)
  })

  await check('390px · 原生触摸可双向浏览作品，纵向手势仍滚动页面', async (page, context) => {
    await center(page, '#work')
    const rail = page.locator('.rail')
    const cdp = await context.newCDPSession(page)
    const swipe = async (dx, dy) => {
      const box = await rail.boundingBox()
      const x = dx < 0 ? 300 : 90, y = Math.max(180, Math.min(480, box.y + 160))
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      for (let i = 1; i <= 12; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 12, y: y + dy * i / 12 }] })
        await page.waitForTimeout(20)
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForTimeout(700)
    }
    await swipe(-210, 0)
    const forward = await rail.evaluate(el => el.scrollLeft)
    assert.ok(forward > 150, `触摸左滑应前进，实际 ${forward}`)
    await swipe(210, 0)
    assert.ok(await rail.evaluate(el => el.scrollLeft) < forward - 100, '触摸右滑应返回')
    const before = await page.evaluate(() => scrollY)
    await swipe(0, -160)
    assert.ok(await page.evaluate(() => scrollY) > before + 60, '作品区域允许纵向浏览页面')
    assert.equal(await rail.getAttribute('data-grab'), null)
  }, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
} finally {
  await browser.close()
  if (production) await new Promise(resolve => server.close(resolve))
  else await server.close()
}
if (failures) process.exitCode = 1
