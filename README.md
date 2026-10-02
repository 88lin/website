# 茉灵智库 · 官网与作品集

一份可核验的接单档案。七章 00–06：先说能接什么活，再用六个深度案例与十个线上仓库兑现。页面上每个数字都写了接口出处，折起来的「数字出处」随时能展开自查。页面本身就是最重要的那件作品。

正式网址：https://dev.88lin.eu.org/

SEO / GEO 维护、标题对照与上线提交说明：[docs/seo-geo.md](docs/seo-geo.md)。域名与站长平台设置仍需按文档核验。
设计规矩与踩坑记录：[DESIGN.md](./DESIGN.md) ｜ 产品事实基线：[PRODUCT.md](./PRODUCT.md)

---

## 快速开始

```bash
npm install
npm run dev              # Vite dev server
npm run build            # client → ssr → prerender，产物在 dist/
npm run verify:seo       # SEO 产物、无 JS 内容与路由元数据
npm run verify           # 验收闸门：事实 / 交互 / 结构 / 设计纪律
npm run shots            # 取景器，出图到 .shots/（人眼过一遍用）
```

Node ≥ 22。`npm run verify` 与 `npm run shots` 都要先 `npm run build`：它们验的是真正要发出去的那份产物，不是 dev server。

---

## 目录

```
src/
  main.tsx            浏览器入口
  entry-server.tsx    SSR 入口。导出 ROUTES / seoTags / llmsText
                      —— head 里的文案由它现算，不在别处存副本
  router.tsx          手写路由（/ 与 /case/:slug/），约 90 行，不引路由库
  App.tsx             外壳：接平滑滚动与指针，分发页面
  pages/              Home.tsx · CasePage.tsx
  sections/           七章：Hero Services Cases Work Craft Notes Contact
  components/
    Deck.tsx          首屏项目叠卡：槽位制，拖 / 箭头 / 圆点 / 方向键都能翻
                      名单 = projects 里 star ≥ DECK_MIN_STARS 的，按 star 降序
    Section.tsx       章头（编号 ─── 章名）与虚线数据面板
    Nav.tsx           顶栏：当前章常亮 + CSS scroll-timeline 进度条
  content/
    site.ts           身份、渠道、七章、六项服务、作品、技术栈与写作文案
    activity.ts       GitHub / 博客快照的格式化与查询入口
    generated/activity.json  自动生成的数字、标签计数、最近更新文章与采集日期
    cases.ts          六个深度案例：论点 / 摘要 / 三段 / 取舍 / 实测 / 数字出处
  lib/
    motion.ts         入场揭示、当前章、懒建 ScrollTrigger、平滑滚动
    caps.ts bus.ts
  styles/
    index.css         令牌、复位、顶栏、按钮、排印零件、00 开场、动效
    sections.css      01–06 各章
    case.css          案例子页
    palettes.css      配色令牌（取自 mydesign-system，只留在用的 A 组）
scripts/              见下
public/
  fonts/              3 个子集化 woff2 + OFL 许可证
  wechat-qr.png       微信二维码（npm run qr 从名片截图制版）
  og.png favicon 全套（同 repair 站那枚）site.webmanifest robots.txt sitemap.xml llms.txt CNAME 404.html
```

---

## 构建管线

`npm run build` 是三段：

1. `build:client` — Vite 打包，`gsap / lenis / react` 各自成 chunk。
2. `build:ssr` — 编出 `dist-ssr/entry-server.js`。
3. `scripts/prerender.mjs` — 遍历 SSR 导出的 `ROUTES`，逐条：
   - 把外壳 HTML 里的 `./` 按路由深度改写成 `../`（同时兼容根域名与子路径部署）；
   - 注入服务端渲染的标记；
   - 用 `seoTags`（由 `content/seo.ts` 从 `site.ts`、`cases.ts` 现算）写入这条路由**自己的** title / description / OG / canonical / JSON-LD，并生成 robots、sitemap、llms.txt 和 CNAME；
   - 输出 `dist/index.html` 与 `dist/case/<slug>/index.html`；
   - 删掉 `dist-ssr/`。

预渲染只改写外壳的 `<head>`，**正文标记保持字节一致**，否则注水会失配。

`index.html` 只保留 SEO 占位符。标题、描述和结构化数据由预渲染统一生成；客户端导航也使用同一来源更新 head。描述里的数字来自当前快照，不手写副本。

`npm run preview` 与 `npm run serve` 共用静态预览服务器（默认端口 4178，可用 `PORT` 环境变量修改），错误地址返回独立 404 页。本站资源采用相对路径，不要在托管配置里直接把所有未知路径回退到原始首页 HTML；深层路径会导致脚本和样式地址失效。

---

## 脚本

| 命令 | 作用 |
|---|---|
| `npm run refresh:data` | 读取 GitHub API / 博客公开数据，校验完整性后替换 JSON 快照 |
| `npm run test:data` | 数据采集测试：分页、统计口径、失败保护、日期与令牌隔离 |
| `npm run test:server` | 预览服务器测试：路径边界、畸形 URL、重定向参数、HEAD 与压缩协商 |
| `npm run verify:runtime` | 开发模式 StrictMode 的滚动实例清理与动态依赖失败回退 |
| `node scripts/build-pages.mjs` | 构建 → 字体采集与子集化 → 重建 → OG / sitemap → 数据验收 |
| `npm run verify` | 验收闸门，见下。要先 build |
| `npm run shots` | 取景器：按屏切片截图到 `.shots/`。`--mobile` / `--route=case/lofi/` |
| `npm run fonts` | 字体流水线：采真实用字 → 定轴 → 子集化 → 零缺字校验，硬预算 200 KB。**改完文案必跑** |
| `npm run static` | 404 / OG 图。robots、sitemap、llms.txt、CNAME 已由每次 build 的 prerender 生成 |
| `npm run verify:seo` | 7 页元数据与 JSON-LD、发现文件、无 JS 问答和导航、前进后退、移动端与子路径回归 |
| `npm run icons` | favicon 全套（svg / ico / png / apple-touch / maskable / webmanifest）。只依赖 PIL；图形取自 repair.88lin.eu.org，见 `mkicon.py` 文件头 |
| `npm run qr` | 微信二维码制版：裁切 → 二值化 → 重染墨色，并自证「零模块改变」 |

OG 图**从真页面取景**：打开 `dist/index.html`，把真实的大标题、读数带、kicker 节点搬进一块 1200×630 的板子上截图。页面改了 OG 自动跟着改，不会出现「分享卡片写着旧数字」这种事。

字体流水线的源文件（得意黑、Noto Sans SC 变量版）不进仓库，只有产物进；缺文件时脚本会打印去哪里下（放 `.shots/fontsrc/`）。

⚠️ **换图标必须让 `index.html` 里的 `?v=` 跟着涨**（现在是 `?v=15`）。浏览器在标签栏 /
书签 / 历史里会绕过 `<link>` 直接要根目录的 `/favicon.ico`，不破缓存就一直吃旧图。
404 页的版本号由 `static.mjs` 从 `index.html` 现读，不用手动同步。

⚠️ **加了文案就必须重跑 `npm run fonts`。** 展示字是按站内实际用字子集化的，
新字不在子集里就会逐字回落到系统字 —— 页面上的表现是「同一个标题里有些字很粗、
有些很细」。实测漏过 39 个字（含 `Skill` 的 S/k/i/l/l 与 `GitHub` 的 H/u/b）。
跑法：`npm run build` → `npm run preview` → 另开终端运行 `npm run fonts`（默认连接 4178 端口）。若设置了 `PORT`，用 `node scripts/fonts.mjs --base=http://127.0.0.1:实际端口` 指定。

---

## 验收闸门

`npm run verify` 分四段断言，任何一条红就非零退出。

**A 事实一致性** — 产物总数、项目卡片、案例数字出处、日期与 `generated/activity.json` 一致；`description` 与 `og:description` 必须现算且彼此一致；部署目录的 sitemap 覆盖全部路由且不冒用统计快照或构建日期作为 `lastmod`；每条路由都有预渲染产物。动态数字不再用历史值黑名单判断（Star 可能合法回落）。`node scripts/verify.mjs --data-only` 只跑这一段，供 Actions 使用。

**B 交互与结构** — 看起来能操作的东西必须真的能操作，四种输入逐个验：
- 叠卡：箭头 / 圆点 / 方向键 / 拖拽都能翻到下一张；最前那张的链接点得中（不被拖拽面吃掉）；5–6 张且每张 star ≥ `DECK_MIN_STARS`
- 横推轨：鼠标滚轮横移、横移时页面不跟着纵滚、拖拽横移、拖完不误触链接、聚焦后方向键可推、到头箭头置灰、到头后把滚动交回页面
- 顶栏当前章高亮、数字出处可展开、章头开幕六章全被点着
- 五档宽度（1440 / 834 / 768 / 390 / 320）无横向溢出、无控制台报错、案例行三块互不重叠
- 手机触摸拖动中断时叠卡复位，不误翻页；重新横滑和点击案例仍可用
- 禁用 JavaScript 时仍能通过原生链接进入案例、切换案例和返回本站首页，保留部署子路径
- 每条案例子页直链 200、单个 H1、无报错
- 禁用 JS 时正文完整（7500+ 字，H1 可读），且首屏四个读数印的是**真值不是 0**
  —— 这条是补一次真事故，见 `components/Count.tsx` 文件头

**C 包体预算** — JS ≤ 320 KB gz、CSS ≤ 24 KB gz、字体 ≤ 200 KB。

**D 设计纪律** — 产物 CSS 里不许有无限循环动画、bounce/elastic 回弹、渐变文字、`text-shadow`、`color-mix()`、纯黑、`filter: blur`；`backdrop-filter` 只允许顶栏那一处。再截一张整页长图按彩度分桶数像素：纸 + 淡底 ≥ 80%、饱和重音 ≤ 8% —— 这条管的是「彩色只做重音，不铺满面」。

为什么闸门要写成脚本：上一轮被点名的三条 bug（叠卡不能翻、横推轨滚不动、墨影落在饱和面上）**在截图里全都完全正常**。截图看得出丑，看不出不能用。

---

## 数据刷新流程

参考 [88lin/home 的 Actions](https://github.com/88lin/home/blob/main/.github/workflows/update-github-stats.yml)，本项目把刷新直接接进 Pages 工作流。每周二北京时间 **08:23**、推送 `main` 或手动运行时，先拉取数据，再构建并部署。定时任务可能排队延迟；只会在默认分支运行。长期没有仓库活动时，GitHub 可能停用定时任务，可在 Actions 重新启用。

- **GitHub**：自动分页读取全部公开仓库，累计 Star / Fork 只计算 `fork=false`；同时更新原创仓库数、fork 仓库数、关注者、following，以及每个展示项目的 Star / Fork。首页、叠卡、作品轨、案例正文、数字出处和分享描述共用同一快照。`home` 包含 fork 仓库的口径不直接套用。
- **博客**：从首页公开的 `__NEXT_DATA__` 读取文章数、标签总数、前 13 个标签计数及最近更新的 6 篇文章，保留永久链接。列表按博客的最近编辑顺序展示，日期使用 `lastEditedDay`，页面标为「最近更新」。
- **日期与失败保护**：用 Asia/Shanghai 日期。任一来源失败、分页不完整、展示仓库缺失或数据格式变化时，保留旧 JSON 并让工作流失败，不部署半份数据；线上继续保留上一次成功产物。快照显示最近成功采集的日期，不能视为实时数值。
- **内容证据**：解析源、Playbook、测试用例等功能数字仍需人工核验出处；自动刷新日期只对应 GitHub / 博客数据。
- **字体与分享图**：新文章可能增加中文用字，Actions 缓存 OFL 源字体、重新子集化，再生成当前读数的 OG 图与 sitemap，并复制到 `dist/`。

Actions 使用自带的 `GITHUB_TOKEN`，只需现有 `contents: read`、`pages: write`、`id-token: write` 权限，无需额外 PAT。刷新和部署在同一工作流，不创建机器人提交，也不依赖提交触发另一轮部署。仓库中的 JSON 是可离线构建的基线快照；最新在线数据在每次部署的产物中。

本地刷新（可通过环境变量 `GITHUB_TOKEN` 或 `GH_TOKEN` 提高 GitHub API 限额，令牌只发给 GitHub）：

```bash
npm run refresh:data
npm run test:data
python -m pip install 'fonttools[woff]' brotli
python scripts/prepare-fonts.py
npx playwright install chromium
node scripts/build-pages.mjs
npm run verify
```

普通离线开发仍可直接 `npm run build`，使用已保存的快照；发布前使用上面的完整流程。不要手改生成 JSON 中的数字。

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
| 窄屏 | 顶栏保持单行，不显示 00–06 章节条；服务两栏转单栏、三列账目行转单栏、渠道胶囊拉成整行、横推轨转 scroll-snap 手势 |
| 老浏览器 | `text-spacing-trim`、`animation-timeline` 都在 `@supports` 里，认不了就没有，不影响功能 |

---

## 部署

只维护 `main` 一个分支。`.github/workflows/deploy.yml` 在推送、每周二定时与手动运行时执行数据刷新、完整构建及 GitHub Pages 部署。仓库 Settings → Pages 的 Source 应为 GitHub Actions。

CI 跑采集单元测试与产物数据验收；完整交互 / 设计验收仍在本地用 `npm run verify` 运行。
