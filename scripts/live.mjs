/**
 * 线上复验：抓 https://88lin.github.io/website/ 的真实页面。
 * 用法：node scripts/live.mjs <outDir>
 * 断言：0 个 4xx/5xx 子资源、0 运行时错误、无横向溢出、字体真的加载到、九个分区都在。
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { findOverflow } from './lib/overflow.mjs';

const OUT = process.argv[2] || '/workspace/live-v3';
const URL = 'https://88lin.github.io/website/';
const STOPS = [
  ['1-hero', '#top'],
  ['2-numbers', '#numbers'],
  ['3-tracks', '#tracks'],
  ['4-work', '#work'],
  ['5-cases', '#cases'],
  ['6-garden', '#garden'],
  ['7-stack', '#stack'],
  ['8-writing', '#writing'],
  ['9-contact', '#contact'],
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});

const report = { url: URL, viewports: {} };

for (const [label, width, height] of [
  ['desktop', 1440, 900],
  ['mobile', 390, 844],
]) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile: label === 'mobile',
  });
  const page = await ctx.newPage();
  const errors = [];
  const bad = [];
  const fonts = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400) bad.push(`${r.status()} ${u}`);
    if (/\.woff2($|\?)/.test(u)) fonts.push(`${r.status()} ${u.split('/').pop()}`);
  });

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.waitForTimeout(1500);

  const sections = await page.$$eval('#root section[id]', (n) => n.map((e) => e.id));
  const family = await page.evaluate(() => {
    const h = document.querySelector('h1');
    return h ? getComputedStyle(h).fontFamily : null;
  });

  for (const [name, sel] of STOPS) {
    await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
      else window.scrollTo(0, 0);
    }, sel);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${label}-${name}.png` });
  }

  // 图片必须在滚完全程之后再数：loading="lazy" 的封面在首屏静止时还没请求，
  // 移动端视口更小、落在阈值外的更多，早测会假报「坏图」。
  const imgs = await page.$$eval('img', (n) =>
    n.map((e) => ({ src: e.currentSrc.split('/').pop() || e.getAttribute('src'), ok: e.naturalWidth > 0 })),
  );
  const overflow = await page.evaluate(findOverflow);
  report.viewports[label] = {
    sections,
    brokenImages: imgs.filter((i) => !i.ok).map((i) => i.src),
    fonts: [...new Set(fonts)],
    bad4xx: [...new Set(bad)],
    errors,
    overflow,
    h1FontFamily: family,
  };
  await ctx.close();
}

await browser.close();
await writeFile(`${OUT}/live.json`, JSON.stringify(report, null, 2));

let fail = 0;
for (const [vp, r] of Object.entries(report.viewports)) {
  const problems = [];
  if (r.sections.length !== 9) problems.push(`分区 ${r.sections.length}/9`);
  if (r.brokenImages.length) problems.push(`坏图 ${r.brokenImages.join(', ')}`);
  if (r.bad4xx.length) problems.push(`4xx ${r.bad4xx.join(' | ')}`);
  if (r.errors.length) problems.push(`报错 ${r.errors.join(' | ')}`);
  if (r.overflow.length) problems.push(`溢出 ${r.overflow.length} 处`);
  if (!r.fonts.length) problems.push('没有加载到任何 woff2');
  if (r.fonts.some((f) => !f.startsWith('200'))) problems.push(`字体 ${r.fonts.join(', ')}`);
  if (problems.length) {
    fail++;
    console.log(`FAIL ${vp} — ${problems.join('；')}`);
  } else {
    console.log(
      `PASS ${vp} — 9 个分区、${r.fonts.length} 个字体 200、0 坏图、0 个 4xx、0 报错、0 溢出`,
    );
    console.log(`     h1 → ${r.h1FontFamily}`);
    console.log(`     字体 → ${r.fonts.join(' · ')}`);
  }
}
process.exit(fail ? 1 : 0);
