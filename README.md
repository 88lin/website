# 茉灵智库 · 个人主页与作品集

Vite + React + GSAP。视觉基准直接取自 [`88lin/mydesign-system`](https://github.com/88lin/mydesign-system)：引入它的 `palettes.css`，页面自己不定义任何色值，全部消费语义 token。九个分区各用一种版式，没有 3D 画布，也没有卡片网格。

线上：<https://88lin.github.io/website/>

## 本地开发

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # 客户端构建 → SSR 构建 → 预渲染注入首屏 HTML
npm run preview
```

`npm run build` 是三步：

1. `build:client` — `tsc -b --noCheck && vite build`
2. `build:ssr` — 把 `src/entry-server.tsx` 单独打成 SSR 包
3. `scripts/prerender.mjs` — 用 SSR 包渲染出首屏 HTML，替换 `dist/index.html` 里的 `<div id="root"></div>`，然后删掉 `dist-ssr/`

首屏因此是真 HTML，不是空壳；`src/main.tsx` 检测到已有 DOM 就走 `hydrateRoot`。

## 目录

```
src/content/site.ts       全站文案与数据（改内容基本只动这一个文件）
src/content/writing.ts    55 篇博客文章的真实元数据，由 scripts/gen-writing.py 生成
src/sections/             九个分区，一个分区一个文件
src/components/           Nav / Cover / ui.tsx（Eyebrow、Note、SectionHead 等原子件）
src/lib/motion.ts         GSAP + ScrollTrigger 封装，统一处理 prefers-reduced-motion
src/lib/asset.ts          静态资源相对路径（勿改回 import.meta.env.BASE_URL，见文件内注释）
src/styles/palettes.css   原样搬运的设计系统配色文件，不要在这里改站点样式
src/styles/index.css      @font-face、@theme token 转发、组件类、首屏关键帧
scripts/                  字体子集、封面截图、静态文件、预渲染、截图、验收、文章数据
```

## 配色：只改一个属性

`src/styles/palettes.css` 是设计系统的原文件（只在头部加了来源注释）。它按 `html[data-palette]` 提供十套配色，站点默认 A「经典」：

```
--brand #2B7FD8   --highlight #F4D758   --pop #E84A5F   --cream #FEFCF6   --ink #1A1A2E
```

`index.html` 上的 `<html data-palette="A">` 改成 `D`（鼠尾草）或 `I`（紫藤），整站跟着换，不用改任何组件。`index.css` 的 `@theme` 是**活引用**（`--color-brand: var(--brand)`），Tailwind 工具类因此也跟着变。

三条硬规则，验收会查：

- **小字号彩色文字只用 `--brand-text` / `--pop-text` / `--brand-deep`**，色块只用 `--brand-surface` / `--pop-surface`。原始 `--brand #2B7FD8` 在奶油底上只有 3.99:1，只能做大字和装饰。
- **半透明一律写 `rgba(var(--brand-rgb), .10)`，禁止 `color-mix()`**。Tailwind 4 的 `/opacity` 修饰符会生成 `color-mix()`，所以全站不用它，需要淡色就走 `--info-soft` / `--border` / `--hairline`。
- **页面里 0 处硬编码十六进制色**。

几处实测踩过的坑，别改回去：

| 组合 | 对比度 | 结论 |
|---|---|---|
| `--brand-text` on `--cream-dark` | 4.43 | 不够，分区微标签改用 `--brand-deep`（6.24） |
| `--on-dark-dim` on `--brand-surface` | 2.96 | 蓝面板上不能用暗白，全部改 `--on-brand` |
| 白 16% alpha 铺在 `--brand-surface` 上 + 白字 | 4.0 | 蓝底上的胶囊改用 `rgba(var(--ink-rgb), .18)` 往深里压，回到 ~6:1 |
| `--ink-faint` 12px 压在彩色统计块上 | 4.1 | 统计块副标改 `--ink-light` |

## 九个分区

一个分区一种版式，取自设计系统的 `layouts.md`；`brand-dna.md` 明确禁止「千篇一律卡片网格」和「所有 section 都居中」。

| # | 分区 | 版式 |
|---|---|---|
| 1 | 首屏 | 双栏不对称：左侧超大衬线中文标题 + 荧光笔标注，右侧倾斜名片 |
| 2 | 数据 | 柔光统计块横排，五个数字用 Fraunces 衬线 |
| 3 | 两条主线 | 分栏对称 + 中缝分隔线与交点菱形 |
| 4 | 精选作品 | 横向自动滚动轨道（见下） |
| 5 | 案例 | Sticky 巨大编号侧栏 + 杂志式三段正文 |
| 6 | 数字花园 | 胶囊筛选栏 + 胶囊标签流 |
| 7 | 技术栈 | 全宽品牌色出血面板 |
| 8 | 写下来的部分 | Sticky 侧栏（年份条形图 + 分类胶囊）+ 右侧真实文章清单 |
| 9 | 联系 | 全宽深色出血面板 + CTA，页脚回到奶油底 |

验收第 7 项会给每个 `section[id]` 算一枚版式指纹（背景色 / display / 标题左边距 / 前三个 `grid-template-columns`）并要求九枚互不相同——加分区时如果照抄了别人的版式，这里会红。

### 精选作品的无缝轨道

轨道内容复制一份，`translateX(0 → -50%)` 循环 60s。三个细节：

- **卡片间距必须做在 `.hscroll__item { margin-right }` 上，不能用 flex `gap`**。`gap` 只出现在项与项之间，复制出的两段接缝处会少一个间距，`-50%` 正好差半个 gap，肉眼可见跳一下。
- hover / focus-within 时 `data-paused="true"` → `animation-play-state: paused`，另有一个显式的「暂停滚动」按钮（键盘可达）。
- `prefers-reduced-motion: reduce` 下动画整个关掉，退回 `overflow-x: auto` + `scroll-snap-type: x mandatory` 原生横滑，克隆项 `display: none`。

设计系统的禁忌清单里有「无限循环动画」，这是唯一一处明知故犯——按需求方要求保留，用慢速 + 悬停暂停 + reduced-motion 完全降级来抵消。

### 溢出检测的正确口径

`scripts/lib/overflow.mjs` 导出的 `findOverflow()` 被截图脚本和验收脚本共用。判定规则是：**只有祖先链全程 `overflow-x: visible` 的元素越出视口才算 bug**，另加 `documentElement.scrollWidth > clientWidth + 1` 兜底。

「元素右边缘超过视口宽度就报错」是错的——轨道本体宽 4052px，克隆卡片全在视口外，那是设计。「和最近的裁剪祖先比」也是错的——`.hscroll` 自己宽度就等于视口。

## 排版

标题衬线 + 正文无衬线，是设计系统的硬要求。Inter 在禁忌清单里，整套删掉了。

```
--font-serif  'Fraunces', 'Noto Serif SC Web', 'Songti SC', 'STSong', serif
--font-sans   -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Segoe UI',
              'Noto Sans SC Web', 'HarmonyOS Sans SC', 'Microsoft YaHei', sans-serif
--font-hand   'Caveat', 'Fraunces', …（只用于三处手写批注，无汉字，中文自动回落）
--font-mono   = --font-sans + tabular-nums（不另外下等宽字体）
```

苹果设备的正文直接吃系统苹方，一个字节都不下载。`system-ui` 被特意排除：它在 Android 上命中 Roboto，会抢在回退栈前面。

自托管字体合计 **170.2 KB**（预算 200 KB）：

| 文件 | 大小 | 内容 |
|---|---|---|
| `NotoSansSC-Regular.woff2` | 104.4 KB | 全站 759 个汉字，仅非苹果设备下载 |
| `Fraunces.woff2` | 23.6 KB | 拉丁可变字重 100–900，定轴 `opsz 48 / WONK 1` |
| `NotoSerifSC-Display.woff2` | 20.6 KB | 只有**衬线标题**真正用到的 99 个汉字 |
| `NotoSansSC-Semibold.woff2` | 14.0 KB | 只有**字重 ≥ 501** 真正用到的 77 个汉字 |
| `Caveat.woff2` | 7.7 KB | 30 个拉丁字符，定轴 `wght 600` |

CJK 不 preload：预加载一百多 KB 是首屏最大的拖累，交给 `font-display: swap` 更划算。

### 子集化流水线（改了文案就要重跑）

```bash
npm run build                    # 1. 先构建，字符采集是在真实产物上做的
node scripts/display-chars.mjs   # 2. 三个断点各渲染一遍，分别采集两桶字符
python3 scripts/subset-fonts.py  # 3. 按字符集切字体
npm run build                    # 4. 再构建一次，带上新字体
```

第 2 步的关键是**两个桶分开采**，早期版本把「字重 ≥ 501 的字符」一份表同时喂给衬线和中黑，两边互相连坐：衬线标题拖进了一堆只在中黑出现的字，中黑又拖进了衬线的，合并字符集 625 个 / 501 个汉字。拆开后分别是 222 / 99 和 199 / 77，两个文件从 93.4 + 74.1 KB 掉到 20.6 + 14.0 KB。

- **serif 桶** = 计算样式 `font-family` 命中 `Noto Serif SC Web` 的字符 → `scripts/serif-chars.txt`
- **bold 桶** = 非衬线且 `font-weight >= 501` 的字符 → `scripts/display-chars.txt`
- 两份都并入 `SAFE` 常量（拉丁大小写、数字、常用中英标点），避免动态文案掉字

推论：CSS 里随手把某个类的字重从 500 提到 550，就会把它那一整段正文的汉字全拖进 Semibold 子集。`.nav-item` / `.pill` / `.garden-pill` / `.post-row__title` 的字重是 500 而不是 550，就是这个原因。漏跑子集化会让新字掉回系统字体、字重跳变——验收第 9 项会抓住。

## 数据刷新

站点里的数字都是真实的，写死在 `src/content/site.ts`，附 `META_AS_OF` 标注截止月份。

```bash
curl -s https://api.github.com/users/88lin | jq '{followers, public_repos}'
curl -s 'https://api.github.com/users/88lin/repos?per_page=100&type=owner' \
  | jq '[.[] | select(.fork | not)] | {repos: length,
        stars: (map(.stargazers_count) | add), forks: (map(.forks_count) | add)}'
```

博客文章数与建站天数取自 <https://blog.88lin.eu.org> 页脚统计。

### 文章清单

`src/content/writing.ts` 由脚本生成，不要手改：

```bash
curl -s https://blog.88lin.eu.org/archive -o /tmp/blog-archive.html
python3 scripts/gen-writing.py /tmp/blog-archive.html
```

数据源是归档页里内嵌的 `<script id="__NEXT_DATA__">`（NotionNext 的完整 posts 数组），**不是逐页抓 `<meta>`**。逐页抓有两处会错：

- `article/33` 的文章页是客户端渲染的空壳，`og:title` / `h1` 全空
- `article/52` 的 `og:section` 写的是 tag 串，不是 category

还有一点：博客的 **tag 和 category 是两套东西**。早期版本展示的「软件资源 11 / AI 工具 9」是 tagOptions，真实的 categoryOptions 是「技术教程 11 / 学习思考 8 / 碎片杂文 7 / 软件工具 7 / Windows 7 …」共 15 项。`article/52` 在数据库里 category 就是空的，脚本保持为空，页面不渲染分类胶囊——不要为了整齐给它编一个。

## 资源生成

```bash
node scripts/covers.mjs   # 真机截图三个线上项目，输出 public/covers/*.webp
node scripts/static.mjs   # favicon / og.png / robots.txt / sitemap.xml / 404.html
```

另外三个项目没有可访问的线上页面，封面是纯排印卡片（`src/components/Cover.tsx` 的 `TYPO` 映射），底色走 `bg-brand-surface` / `bg-highlight-soft` / `bg-dark-panel` 三种工具类。

> `index.css` 里的组件类**不在 Tailwind 的 utilities 层**，优先级高于工具类。`.work-card__shot` 曾经带一行 `background: var(--preview-bg)`，把三张排印封面全刷成浅米底 + 白字（白底白字）。验收第 1 项现在会遍历 `#root [class*="bg-"]`，把 class 里的 token 名和实算 `backgroundColor` 逐个比对。

## 验收

```bash
npm run build
node scripts/shots.mjs /workspace/shots               # 目检截图，9 个分区 × 2 视口
node scripts/shots.mjs /workspace/shots --palette=D   # 换配色再来一组
node scripts/shots.mjs /workspace/shots --reduced
node scripts/audit.mjs                                # 全量；--skip-lh --skip-links 可快跑
node scripts/live.mjs /workspace/live                 # 部署后打线上：分区/字体/坏图/4xx/溢出
```

沙箱和 CI 都没有 GPU，Playwright 强制 `--use-gl=swiftshader`。

九项检查，任何一项 fail 都非零退出，结果落在 `/workspace/audit.json`：

| # | 检查 | 判据 |
|---|---|---|
| 1 | 子路径部署 | `/website/` 下九个分区挂载、位图 `naturalWidth > 0`、`bg-*` 工具类未被组件 CSS 覆盖、0 个 4xx、0 运行时错误 |
| 2 | Lighthouse | 桌面与移动都跑真实页面：Perf ≥ 90、A11y ≥ 96、**CLS 必须为 0**、LCP < 2.5s |
| 3 | 对比度 | 全节点采样 ≥ WCAG AA（正文 4.5:1，大字 3:1） |
| 4 | 破折号 | 中文里没有孤立的 `—` / `–`（跳过注释与 `palettes.css`） |
| 5 | 版式纪律 | 每个分区至多 1 个 eyebrow、导航单行、链接不折行 |
| 6 | reduced-motion | 实时断言：轨道动画停止且位移不变、退回 `overflow-x: auto` + snap、克隆项隐藏、入场元素全部可见 |
| 7 | 交互与版式 | 花园可点元素 ≥ 40 且**全部是胶囊**、写作区 `/article/` 链接 ≥ 12、轨道封面无空白滑入、两视口 0 溢出、九枚版式指纹互不相同 |
| 8 | 外链 | 站外链接全查 + 文章链接抽查 15 条，全部 < 400（5xx / 429 退避重试两次） |
| 9 | 字体与设计系统 | 两份子集三个断点 0 缺字、总量 ≤ 200 KB、0 处 Inter、0 处硬编码色、0 处 `color-mix()` |

第 7 项是专门为四个曾经真实存在的 bug 加的守卫：花园 41 个链接的 `border-radius` 计算值全是 0px、`#writing` 整区只有 1 个 `<a>`、作品卡片在 1440 视口下右边缘跑到 1969px，以及轨道封面空白滑入。

最后一条是上线后打线上才发现的：浏览器对 `loading="lazy"` 的**横轴**几乎不做提前量，卡片要滑到视口内约 40% 才开始请求。移动端实测 `gzh.webp` 在 `t=8s`（卡片左边缘 403px，已经露头）时仍然空白，到 `t=15s` 才补上——用户看到的是一张空白卡片滑进来再闪出图。修法是 `Work.tsx` 用 IntersectionObserver 在分区靠近视口（`rootMargin: 600px`）时把整条轨道的图一次性转成 `eager`，而不是给每张图单独判定。`node scripts/probe-lazy.mjs [url]` 可以单独跑这一条。

第 5 项的 eyebrow 判据是「每分区至多 1 个」而不是「全站 ≤ 3」：分区微标签是 `ds-scene-landing.md` 明确要求的系统化元素，当前七个（SELECTED WORK / CASE STUDIES / DIGITAL GARDEN / TWO TRACKS / TOOLBOX / WRITING / GET IN TOUCH）。

当前成绩：桌面 Perf 100 / LCP 0.5s / TBT 0ms，移动 Perf 96 / LCP 2.34s / TBT 21ms，两端 A11y 96、BP 100、SEO 92、**CLS 0**；991 个文本节点最低对比度 4.53:1。

## 部署

推到 `main` 即触发 `.github/workflows/deploy.yml`（Node 22 → `npm ci` → `npm run build` → `actions/deploy-pages`）。

如果 Actions 没跑起来，去 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。

`vite.config.ts` 里 `base: './'`，产物全是相对路径，换自定义域名只要在 `public/` 放一个 `CNAME` 再配 DNS，不用改构建配置。

## 降级

- `prefers-reduced-motion: reduce` → 入场动画落终态、滚动编排关闭、轨道停转并退回原生横滑
- 无 JS → 预渲染的首屏 HTML 仍然可读，`.no-js .js-fade { opacity: 1 }` 保证入场元素不会永久隐形
- 打印 → 轨道停止动画并换行铺开

每个带 `js-fade` 的元素都必须在 `src/lib/motion.ts` 里有对应的 `fadeUp` 选择器，否则它的 `opacity: 0` 永远不会被解除。当前 38 个，验收第 6 项会数。

## 素材

页面上没有插画、3D 模型或 AI 生成图。项目封面是三个线上站点的真实 Playwright 截图，其余三个是排印卡片。

字体：Fraunces、Caveat、Noto Serif SC、Noto Sans SC，均为 OFL，已按站点用字子集化，授权文件在 `public/fonts/LICENSE-*.txt`。配色文件来自 `88lin/mydesign-system`。
