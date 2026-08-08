/** 单次 Lighthouse 诊断：打印各项指标、LCP 元素与主要 opportunity。 */
import { chromium } from 'playwright'
import path from 'node:path'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { serveDist } from './lib/serve.mjs'

const DIST = new URL('../dist/', import.meta.url).pathname
const PORT = 4201
const PREFIX = '/website/'
const { server } = await serveDist({ dist: DIST, port: PORT })

const chrome = await launch({
  chromePath: chromium.executablePath(),
  chromeFlags: ['--headless=new', '--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
})
const r = await lighthouse(
  `http://127.0.0.1:${PORT}${PREFIX}`,
  { port: chrome.port, output: 'json', logLevel: 'error' },
  {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
      throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4, requestLatencyMs: 562.5, downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675 },
      blockedUrlPatterns: ['*three-*.js', '*Stage-*.js'],
      onlyCategories: ['performance'],
    },
  }
)
await chrome.kill()
server.close()
const a = r.lhr.audits
console.log('score', Math.round(r.lhr.categories.performance.score * 100))
for (const k of ['first-contentful-paint', 'largest-contentful-paint', 'speed-index', 'total-blocking-time', 'cumulative-layout-shift', 'interactive', 'max-potential-fid'])
  if (a[k]) console.log(`  ${k.padEnd(28)} ${a[k].displayValue}  (score ${a[k].score})`)
console.log('\nLCP element:')
console.log(JSON.stringify(a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet || a['largest-contentful-paint-element']?.details?.items, null, 1)?.slice(0, 900))
console.log('\nOpportunities / diagnostics:')
for (const [k, v] of Object.entries(a))
  if (v.details && (v.details.type === 'opportunity') && v.numericValue > 60)
    console.log(`  ${k.padEnd(34)} ${v.displayValue}`)
console.log('\nNetwork critical chain / long tasks:')
console.log('  render-blocking:', a['render-blocking-resources']?.displayValue || '-')
console.log('  font-display   :', a['font-display']?.score, a['font-display']?.displayValue || '')
const req = a['network-requests']?.details?.items || []
for (const it of req.slice(0, 14))
  console.log(`  ${String(Math.round(it.endTime)).padStart(5)}ms ${String(Math.round((it.transferSize || 0) / 1024)).padStart(4)}kB ${it.url.split('/').pop()}`)
