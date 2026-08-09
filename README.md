# 茉灵智库 · 官网与作品集

**v5「接口机架」** — 把整个站做成一面竖着的设备机架，九个机位，五扇窗，窗后跑着实时 WebGL。

线上：https://88lin.github.io/website/
设计决策与踩坑记录：[DESIGN.md](./DESIGN.md)

---

## 快速开始

```bash
npm install
npm run dev            # Vite dev server
npm run build          # client → ssr → prerender，产物在 dist/
npm run preview
```

Node ≥ 20（开发在 v22.14.0 上）。

---

## 目录

```
src/
  main.tsx            浏览器入口：注水 + 能力探测 + 点火
  entry-server.tsx    SSR 入口，导出 ROUTES 供预渲染遍历
  router.tsx          极简路由（/ 与 /case/:slug）
  pages/              Home.tsx · CasePage.tsx
  sections/           九个机位：Hero Metrics Tracks Works Cases
                      Garden Stack Writing Contact
  components/
    Bay.tsx           机位外壳：底色、编号导轨、窗口、入场变体
    Stage.tsx         WebGL 挂载点与降级图版
    Annot.tsx         手绘批注（确定性抖动框 + 引线）
    Strip.tsx Foot.tsx Reveal.tsx Icons.tsx
  content/
    site.ts           身份、渠道、指标、文案 —— 唯一的事实源
    cases.ts          三个案例的正文、结论、数字，含 18 路接口 / 22 个适配器
  lib/
    bus.ts            语义信号总线（channel/progress/pointer/aperture）
    motion.ts         滚动编排、机位追踪、案例栈、继电动作
    caps.ts           设备分档（是否点火、粒子密度）
    frame.ts          mulberry32 + Catmull-Rom → 确定性手绘路径
    asset.ts          子路径资源前缀（GitHub Pages 部署在 /website/ 下）
  webgl/
    Rack.ts           场景装配、机架几何、透镜、每帧循环
    particles.ts      GPU 粒子总线
    post.ts           手写合成 shader（色差/bloom/暗角/ACES/网点/颗粒）
    textures.ts       程序化贴图（丝印跑马灯、粒子种子）
  styles/index.css    全部样式，手写，自带 reset
scripts/              见下
public/
  fonts/              6 个子集化 woff2 + OFL 许可证
  plates/             五张静态图版（手机端与首帧用）
  covers/             四张案例封面
  og.png favicon.svg robots.txt sitemap.xml 404.html
```

---

## 构建管线

`npm run build` 是三段：

1. `build:client` — Vite 打包，`three / gsap / react / lenis / Rack` 各自成 chunk。
2. `build:ssr` — 编出 `dist-ssr/entry-server.js`。
3. `scripts/prerender.mjs` — 遍历 SSR 导出的 `ROUTES`，逐条：
   - 把外壳 HTML 里的 `./` 按路由深度改写成 `../`；
   - 注入服务端渲染的标记；
   - 从 `META` 表写入这条路由**自己的** `<title>` / description / og / canonical；
   - 输出 `dist/index.html` 与 `dist/case/<slug>/index.html`；
   - 最后删掉 `dist-ssr/`。

预渲染只改写外壳的 `<head>`，**正文标记保持字节一致**，否则注水会失配。

---

## 脚本

| 命令 | 作用 |
|---|---|
| `node scripts/chars.mjs` | Playwright 跑 4 路由 × 2 视口，按 `fontFamily+weight` 采集真实渲染字符，写进 `scripts/chars/*.txt` |
| `python3 scripts/subset-fonts.py` | 6 个子集任务，钉死变量字重、转 woff2、丢无用表、拷 OFL。**总量超过 200 KB 直接非零退出** |
| `node scripts/plates.mjs` | 烘焙静态图版：起 dist、点火 3D、逐窗裁 `.chassis__bezel`（2× DPR）→ `public/plates/*.webp` |
| `node scripts/covers.mjs` | 抓三个仍在线的项目站真实截图做封面 |
| `node scripts/cover-vip.mjs` | 生成 `video_vip` 封面（脚本类项目没有界面可截，用真实接口清单画） |
| `node scripts/static.mjs` | 程序化生成 favicon / OG / robots / sitemap(4 条) / 404 |
| `node scripts/shots.mjs` | 开发期取景器，见下 |
| `node scripts/audit.mjs` | 验收闸门 |

### 取景器

```bash
node scripts/shots.mjs                      # 桌面 1440×900，强制点火
node scripts/shots.mjs --mobile             # 390×844，不点火，走静态图版
node scripts/shots.mjs --no-gl              # 桌面但不点火，看降级形态
node scripts/shots.mjs --bare               # 隐掉全部前景，只看 3D 场景本身
node scripts/shots.mjs --route=case/lofi/
node scripts/shots.mjs --full               # 追加一张整页长图
```

沙盒和 CI 都没有 GPU，Chromium 必须带 `--use-gl=swiftshader --enable-unsafe-swiftshader`。
它会顺带打印每个机位的高度、vh 占比、窗口尺寸，以及全部控制台报错与失败请求。

---

## 数据刷新流程

`src/content/site.ts` 与 `cases.ts` 里的每一个数字都是**实测**的，不许拍脑袋。
`AS_OF` 标着核实日期，页面上也印着这个日期。

1. **GitHub**：`api.github.com/users/88lin` 取 followers / public_repos / created_at；
   翻 `users/88lin/repos?per_page=100`，**滤掉 fork**，对自有仓库求 star 与 fork 之和。
   当前：followers 144 · 公开仓库 103（自有 22 / fork 81）· Σstar 4,684 · Σfork 502。
2. **博客**：`blog.88lin.eu.org` 取文章数与建站天数。当前 55 篇 / 1784 天。
   首页那 27 个词是**标签**不是分类，文案里必须写「标签」。
3. **video_vip**：数字直接数 `vv.user.js` 源码 —— 714 行、`@version 3.1.10`、
   35 条 `@include`、**18 路启用的解析接口**（源码里还有第 19 条被注释掉了，不算）、22 个站点适配器。
4. 改完文案 → 重跑 `chars.mjs` + `subset-fonts.py`（字表变了）→ `npm run build`。

`npm run audit` 的第 8 道闸门会重新拉一次 GitHub 与博客，和 `site.ts` 里的值对账，对不上就失败。

---

## 配色硬规则

完整表与对比度实测见 [DESIGN.md §1](./DESIGN.md)。改色时这四条不能破：

- 正文 ≥ 4.5:1，大字与非文字 ≥ 3:1。**每个底色都要有自己的正文色与次级色**。
- `--panel (#fffdf4)` 只做面板，**永远不做页面底色**；`--ink` 只做字和丝印；
  `--screen` 只做小读数窗，单格内占比不超过 ~30%。
- `--verm-hot (#ff3a2c)` 只做灯，**不承载任何文字**。
- 朱红底 (`data-ground='verm'`) 上批注色只能用柠檬，别的都掉到 3:1 以下。

禁令：不要浅色柔和极简、不要深色模式、不要居中平庸 Hero、不要模板化布局。

---

## WebGL 场景参数

`BAYS=9 · SCENE_H=22 · BAY_GAP=2.75 · BUS_X=1.92 · LENS_X=2.02`。
PerspectiveCamera fov 38 @ z=6.2。机架行距 `U=0.30`，左右填到 ±5.4。
走线槽背板在 z=-0.86（**不是**远景背景 z=-3.6，原因见 DESIGN.md §5「1.46 倍放大」）。

合成参数：`uThreshold 0.86 · uBloomStrength 0.34 · uExposure 0.95 · uAberration 0.018 · uGrain 0.05`。
粒子：`uAlpha = 0.05 * (256/side)²`，`side` 高配 96 / 其余 64，`uSize 26`。

改这些之前先读 DESIGN.md §5，那里记着四条一改就翻车的耦合关系
（窗口决定颗粒度、开口放大率、丝印画布与 shader 配平、加性能量预算）。

---

## 降级语义

| 场景 | 行为 |
|---|---|
| 无 JS | 预渲染的完整页面，`--rv` 默认 1，所有内容可见可读 |
| 有 JS 未点火 | 静态图版留在窗口里 |
| 点火成功 | `<html>` 加 `.gl-on`，图版隐藏，canvas 接管 |
| 手机 / 低端 | `caps.ts` 判定不点火，**不创建 WebGL 上下文**，永远走图版 |
| `prefers-reduced-motion` | 不建 canvas、无无限动画、`--rv` 复位为 1 |

---

## 验收闸门

`npm run audit`：

1. 对比度 —— 正文 ≥4.5:1，大字与非文字 ≥3:1。
2. 版式指纹 —— 九个机位的 `grid-template-columns` 元组**必须两两不同**（防模板化）。
3. 溢出 —— `findOverflow()` 只统计整条祖先链都是 `overflow-x: visible` 的元素。
4. 预渲染 —— 4 条路由各自有独立 H1 和 >1KB 正文。
5. 性能 —— LCP <2.5s、CLS <0.1、TBT <300ms、JS ≤320 KB gz。
6. reduced-motion —— 不建 canvas、无无限动画、内容可见。
7. 手机 390×844 —— 无 WebGL 上下文、图版加载、无横向滚动。
8. 数据可核 —— 重新拉 GitHub 与博客，和 `site.ts` 对账。
9. 外链 —— 全部 HTTP < 400。

---

## 分支

`main` 是线上。历史版本各留一支：`v1-original` · `v2-visual` · `v3-redesign` · `v4-current` · `v5-rack`。
