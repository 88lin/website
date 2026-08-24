# 茉灵智库 · 官网与作品集

**v13** — 一份可核验的工程档案。七章 00–06，页面上每个数字都写了接口出处，折起来的「数字出处」随时能展开自查。页面本身就是最重要的那件作品。

线上：https://88lin.github.io/website/
设计决策与踩坑记录：[DESIGN.md](./DESIGN.md) ｜ 产品事实基线：[PRODUCT.md](./PRODUCT.md) ｜ **接手先读：[HANDOFF.md](./HANDOFF.md)**

---

## 快速开始

```bash
npm install
npm run dev              # Vite dev server
npm run build            # client → ssr → prerender，产物在 dist/
npm run verify           # 67 道闸门：事实 / 交互 / 结构 / 设计纪律
npm run shots            # 取景器，出图到 .shots/（人眼过一遍用）
```

Node ≥ 20。`npm run verify` 与 `npm run shots` 都要先 `npm run build`：它们验的是真正要发出去的那份产物，不是 dev server。

---

## 目录

```
src/
  main.tsx            浏览器入口
  entry-server.tsx    SSR 入口。导出 ROUTES / HOME_DESC / CASE_META
                      —— head 里的文案由它现算，不在别处存副本
  router.tsx          手写路由（/ 与 /case/:slug/），约 90 行，不引路由库
  App.tsx             外壳：接平滑滚动与指针，分发页面
  pages/              Home.tsx · CasePage.tsx
  sections/           七章：Hero Cases Craft Work Garden Notes Contact
  components/
    Deck.tsx          首屏案例叠卡：槽位制，拖 / 箭头 / 圆点 / 方向键都能翻
    Section.tsx       章头（编号 ─── 章名）与虚线数据面板
    Nav.tsx           顶栏：当前章常亮 + CSS scroll-timeline 进度条
  content/
    site.ts           身份、渠道、指标、七章、作品、小站、写作 —— 唯一事实源
    cases.ts          四个深度案例：论点 / 摘要 / 三段 / 取舍 / 实测 / 数字出处
  lib/
    motion.ts         入场揭示、当前章、懒建 ScrollTrigger、平滑滚动
    caps.ts bus.ts bp.ts
  styles/
    index.css         令牌、复位、顶栏、按钮、排印零件、00 开场、动效
    sections.css      01–06 各章
    case.css          案例子页
    palettes.css      配色令牌（vendor from mydesign-system，A~J 十组）
scripts/              见下
public/
  fonts/              3 个子集化 woff2 + OFL 许可证
  og.png favicon 全套 site.webmanifest robots.txt sitemap.xml 404.html
```

---

## 构建管线

`npm run build` 是三段：

1. `build:client` — Vite 打包，`gsap / lenis / react` 各自成 chunk。
2. `build:ssr` — 编出 `dist-ssr/entry-server.js`。
3. `scripts/prerender.mjs` — 遍历 SSR 导出的 `ROUTES`，逐条：
   - 把外壳 HTML 里的 `./` 按路由深度改写成 `../`（GitHub Pages 子路径部署）；
   - 注入服务端渲染的标记；
   - 用 `HOME_DESC` / `CASE_META`（都从 `site.ts`、`cases.ts` 现算）写入这条路由**自己的** `<title>` / description / og / canonical；
   - 输出 `dist/index.html` 与 `dist/case/<slug>/index.html`；
   - 删掉 `dist-ssr/`。

预渲染只改写外壳的 `<head>`，**正文标记保持字节一致**，否则注水会失配。

`<head>` 里的描述**不写数字**。带数字的那版由预渲染现算后换进去 —— 手写一份副本就一定会过期，而分享卡片和页面对不上比没有描述更糟。这条有闸门看着。

---

## 脚本

| 命令 | 作用 |
|---|---|
| `npm run verify` | 验收闸门，见下。要先 build |
| `npm run shots` | 取景器：按屏切片截图到 `.shots/`。`--mobile` / `--route=case/lofi/` |
| `npm run fonts` | 字体流水线：采真实用字 → 定轴 → 子集化 → 零缺字校验，硬预算 200 KB |
| `npm run static` | robots / sitemap / 404 / OG 图。sitemap 从 `ROUTES` 与 `AS_OF` 现算 |
| `npm run icons` | favicon 全套（svg / ico / 三档 png / apple-touch / webmanifest） |

OG 图**从真页面取景**：打开 `dist/index.html`，把真实的大标题、读数带、kicker 节点搬进一块 1200×630 的板子上截图。页面改了 OG 自动跟着改，不会出现「分享卡片写着旧数字」这种事。

字体流水线的源文件（得意黑、Noto Sans SC 变量版）不进仓库，只有产物进；缺文件时脚本会打印去哪里下。

---

## 验收闸门

`npm run verify` 是四段 67 条断言，任何一条红就非零退出。

**A 事实一致性** — 产物里的数字必须等于 `site.ts` / `cases.ts` 的当前值；七个已知旧值（`4,764`、`4,658`、`24 个原创`…）在任何 HTML 里出现一次就红，注释里也不许留；`description` 与 `og:description` 必须由源码现算且彼此一致；sitemap 覆盖全部路由且 `lastmod = AS_OF`；每条路由都有预渲染产物。

**B 交互与结构** — 看起来能操作的东西必须真的能操作，四种输入逐个验：
- 叠卡：箭头 / 圆点 / 方向键 / 拖拽都能翻到下一张
- 横推轨：鼠标滚轮横移、横移时页面不跟着纵滚、拖拽横移、拖完不误触链接、聚焦后方向键可推、到头箭头置灰、到头后把滚动交回页面
- 顶栏当前章高亮、数字出处可展开、章头开幕六章全被点着
- 三档宽度（1440 / 834 / 390）无横向溢出、无控制台报错、案例行三块互不重叠
- 四条子页直链 200、单个 H1、无报错
- 禁用 JS 时正文完整（5500+ 字，H1 可读）

**C 包体预算** — JS ≤ 320 KB gz、CSS ≤ 24 KB gz、字体 ≤ 200 KB。

**D 设计纪律** — 产物 CSS 里不许有无限循环动画、bounce/elastic 回弹、渐变文字、`text-shadow`、`color-mix()`、纯黑、`filter: blur`；`backdrop-filter` 只允许顶栏那一处。再截一张整页长图按彩度分桶数像素：纸 + 淡底 ≥ 80%、饱和重音 ≤ 8% —— 这条管的是「彩色只做重音，不铺满面」。

为什么闸门要写成脚本：上一轮被点名的三条 bug（叠卡不能翻、横推轨滚不动、墨影落在饱和面上）**在截图里全都完全正常**。截图看得出丑，看不出不能用。

---

## 数据刷新流程

`site.ts` 与 `cases.ts` 里每一个数字都是实测的，不许拍脑袋。`AS_OF` 标着核实日期，页面上也印着这个日期。

1. **GitHub**：`api.github.com/users/88lin` 取 followers；翻 `users/88lin/repos?per_page=100&type=owner`，**滤掉 fork**，对自有仓库求 star 与 fork 之和。
2. **博客**：`blog.88lin.eu.org` 首页取文章数、建站天数与标签计数。那 27 个词是**标签**不是分类，一篇可挂多个，所以合计比文章数大 —— 文案里必须说清楚。
3. **video_vip**：数字直接数 `video_vip.user.js` 源码（版本、`@include` 条数、启用的解析接口数、站点适配器数）。源码里还有一路被注释掉的接口，不算。
4. 改完文案 → `npm run fonts`（字表可能变了）→ `npm run build` → `npm run static` → `npm run verify`。

第 4 步的顺序不能颠倒：OG 图是从构建产物取景的，`verify` 验的也是产物。

---

## 配色硬规则

完整推导见 [DESIGN.md](./DESIGN.md)。改色时这几条不能破：

- 颜色只从 `palettes.css` 的语义令牌取，禁 `color-mix()`。
- 地面只用两档近白纸色（`#fdfcf8` / `#fff`，都加同一张纸纹砖），严格交替。**不许整章刷饱和底**。
- 蓝 / 柠檬黄 / 珊瑚红只做边、条、编号、读数，以及全页两块重音面（中段黄底论点、末尾蓝底联系）。
- **墨影只准落在纸面上。** 落到饱和色面上会发脏发黑，放大看就是一块硬边黑方块。饱和面上的投影必须用那个面自己的色相。
- 正文 ≥ 4.5:1。

---

## 降级语义

| 场景 | 行为 |
|---|---|
| 无 JS | 预渲染的完整页面，内容全部可见可读；`.js` 类由兜底定时器摘掉 |
| JS 加载失败 | 同上。2.5 秒兜底把 `.js` 摘掉，绝不因为动效没跑起来而把正文藏住 |
| `prefers-reduced-motion` | 揭示与视差整套退化为静态（不是变慢），不建 ScrollTrigger |
| 窄屏 | 三列账目行转单栏、规格表按件读、横推轨转 scroll-snap 手势 |
| 老浏览器 | `text-spacing-trim`、`animation-timeline` 都在 `@supports` 里，认不了就没有，不影响功能 |

---

## 分支

`v2-visual` 是当前部署分支（历史原因，跑的是 v7）。历史版本各留一支：`v1-original` ~ `v12`，当前工作分支 `v13-dualread`。

切换上线分支要改 `.github/workflows/deploy.yml` 的触发分支 —— 这一步等定稿后单独做。
