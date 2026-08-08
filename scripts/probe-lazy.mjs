// 验证轨道封面不再空白滑入。用法：node scripts/probe-lazy.mjs [url]
import { chromium } from 'playwright';
import { serveDist } from './lib/serve.mjs';

let stop = null;
let url = process.argv[2];
if (!url) {
  const s = await serveDist({ dist: new URL('../dist', import.meta.url).pathname, port: 4219 });
  stop = () => s.server.close();
  url = s.url;
}

const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let fail = 0;
for (const [label, w, h] of [
  ['desktop', 1440, 900],
  ['mobile', 390, 844],
]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: label === 'mobile' });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle', timeout: 90_000 });
  // 分区还没进视口时，轨道里的图不该被下载（不能拖累首屏）
  const before = await p.$$eval('#work img', (n) => n.filter((e) => e.naturalWidth > 0).length);
  await p.evaluate(() => document.querySelector('#work').scrollIntoView({ block: 'start' }));
  await p.waitForTimeout(1200);
  const after = await p.$$eval('#work img', (n) =>
    n.map((e) => `${(e.getAttribute('src') || '').split('/').pop()}:${e.naturalWidth > 0 ? 'ok' : 'BLANK'}`),
  );
  const blank = after.filter((s) => s.endsWith('BLANK'));
  const ok = blank.length === 0;
  if (!ok) fail++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${label} — 进视口前已下载 ${before} 张；停 1.2s 后 ${after.length - blank.length}/${after.length} 张就位` +
      (blank.length ? ` — 仍空白：${blank.join(', ')}` : ''),
  );
  await ctx.close();
}
await b.close();
if (stop) stop();
process.exit(fail ? 1 : 0);
