# 茉灵智库 · 个人主页与作品集

Vite + React + Three.js + GSAP。信号朱红 × 钴蓝双色系统，一块全屏 WebGL 画布贯穿九个分区，画布里是一组程序化生成的色散玻璃晶簇。

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
src/content/site.ts      全站文案与数据（改内容基本只动这一个文件）
src/sections/            九个分区，各自用 useScene() 声明自己的 3D 目标状态
src/webgl/               Stage / Crystals / Backdrop / env / StageContext
src/lib/motion.ts        GSAP + ScrollTrigger 封装，统一处理 prefers-reduced-motion
src/lib/asset.ts         静态资源相对路径（勿改回 import.meta.env.BASE_URL，见文件内注释）
src/styles/index.css     设计令牌、@font-face、首屏 CSS 关键帧
scripts/                 字体子集、封面截图、静态文件、预渲染、截图、验收
```

## 3D 场景

`src/webgl/` 只有四个文件，没有任何模型或贴图，几何全部在运行时生成：

- **`Crystals.ts`** — 六根手写的棱柱（`RECIPE` 里给边数、高度、腰径、收腰、上下锥尖与抖动量），每根一个 `MeshPhysicalMaterial`：`transmission: 1` + `dispersion` + `iridescence` + `attenuationColor` / `attenuationDistance`，`flatShading` 保住硬边。低性能设备只取前四根，并把 `iridescence` 关掉、`dispersion` 降到 2.4。
- **`Backdrop.ts`** — 挂在相机上的全屏不透明面片，一个片元着色器同时画三件事：纸底、页面级的钴蓝/朱红/墨色色块，以及跟着晶簇走的那团「光台」（光晕 + 三根光带）。
- **`Stage.ts`** — 渲染器、灯光、阻尼插值。每帧先摆好相机、再把晶簇中心投影成 NDC 交给 `backdrop.aim()`，顺序反了光团会慢相机一帧。
- **`env.ts`** — 一张 1024×512 的 canvas 等距柱状图（渐变底 + 五个径向光源 + 三根横向灯管）过 PMREM，当环境贴图用。没有 HDR 文件要下载。

### 为什么背景必须是不透明的

three 的 `transmission` 采样的是一张**只装了 3D 场景不透明物体**的内部 RT，它看不见画布后面的 HTML，而且这张 RT 是用渲染器的 clear color 清屏的。所以：

- 画布 `alpha: false`，`setClearColor(0xfbf5eb, 1)`
- 背景是场景里一块真实的不透明面片，不是 CSS 背景
- 这块面片必须**绕过 tone mapping**（片元里只 `#include <colorspace_fragment>`），否则纸底和页面对不上，接缝一眼可见
- `transparent: true` 的物体会被 three 排除在 transmission pass 之外，所以光晕不能做成半透明面片——它被合进了背景本身

一块纯色平背景会让晶体看起来像磨砂塑料（没有折射结构可采样），背景里的色块和光带就是喂给折射的「景」。

### 每个分区怎么控制它

分区用 `useScene(ref, wide, narrow?)` 声明目标姿态，`Stage` 负责阻尼过渡。`wide` 也可以写成 `(vw, vh) => targets` 的函数形式——「主线」那一屏就是靠它把晶簇算进右侧那个圆孔里的。

```ts
useScene(ref, { clusterX: -3.0, clusterScale: 0.72, dispersion: 4.6, glow: 0.85, tint: 0.46, camZ: 7.4 })
```

`Stage.set()` 是**绝对赋值**（`{ ...DEFAULTS, ...partial }`），不是合并。没写的字段回落到 `DEFAULTS`，不会从上一屏继承——早期版本用 `Object.assign` 合并，结果「主线」那屏放大的 `aura` 漏进了后面每一屏。代价是每个分区的目标对象都要写全。

## 排版

字体栈第一位是 `-apple-system, BlinkMacSystemFont`：苹果设备直接用系统里的 SF Pro + 苹方，一个字节都不下载。SF Pro 的授权不允许当 webfont 分发，所以非苹果设备回落到 Inter（拉丁）+ Noto Sans SC（中文），两个都是 OFL。

字体回落是**逐字符**生效的，所以 `system-ui` 被特意排除在外——它在 Android 上会命中 Roboto，抢在 Inter 前面。

```
--font-sans     -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'PingFang SC', …
--font-display  同上，但换 'SF Pro Display', 'Inter Display'
--font-mono     = --font-sans + tabular-nums + 字重 560（对齐 apple.com 的做法，不另外下等宽字体）
```

正文 17px / 行高 1.62 / 字距 -0.011em / 字重 420；全站最小字号 14px，且 14px 那一档统一走 `mono`（560）或 `font-medium`（500），不留细小灰的字。次级墨色 `--color-ink-70` 是 78.8% 不透明度的墨色，纸底上 9.04:1。

圆角标度 `8 / 12 / 16 / 22 / 30 / 40 / 56 / 980px`，按钮和标签走 `--radius-full` 胶囊。

## 数据刷新

站点里的 star / fork / 仓库数 / 博客篇数都是真实数字，写死在 `src/content/site.ts`，附 `META_AS_OF` 标注截止月份。刷新时：

```bash
curl -s https://api.github.com/users/88lin | jq '{followers, public_repos}'
curl -s 'https://api.github.com/users/88lin/repos?per_page=100&type=owner' \
  | jq '[.[] | select(.fork | not)] | {repos: length,
        stars: (map(.stargazers_count) | add), forks: (map(.forks_count) | add)}'
```

博客的文章数与建站天数取自 <https://blog.88lin.eu.org> 页脚统计。改完记得同步 `META_AS_OF`。

## 资源生成

```bash
node scripts/covers.mjs         # 真机截图三个线上项目，输出 public/covers/*.webp
node scripts/static.mjs         # favicon / og.png / robots.txt / sitemap.xml / 404.html

node scripts/display-chars.mjs  # 从构建产物采集所有以字重 >= 501 渲染的字符
python3 scripts/subset-fonts.py # 按该字符集子集化字体
```

Noto Sans SC 的 Regular 带全站汉字（88 KB），Semibold 只带真正加粗用到的那 164 个汉字（26 KB）。**改了任何加粗文案就要重跑上面两条**，否则新字会掉回系统字体、字重跳变——验收第 9 项会替你抓住这个。

CJK 字体不 preload：99 KB 的预加载是首屏最大的一块拖累，交给 `font-display: swap` 更划算。

## 验收

```bash
npm run build
node scripts/shots.mjs /workspace/shots            # 目检用截图，9 个滚动位 × 2 视口
node scripts/shots.mjs /workspace/shots-reduced  --reduced
node scripts/shots.mjs /workspace/shots-nowebgl  --nowebgl
SHOTS_DIR=/workspace/shots node scripts/audit.mjs
```

`shots.mjs` 会强制 `--use-gl=swiftshader`：沙箱和 CI 都没有 GPU，不加这个截出来的画布是空白的。

九项检查，任何一项 fail 都会让进程非零退出：

| # | 检查 |
|---|---|
| 1 | `/website/` 子路径下 9 个区块挂载、canvas 存在、0 个 4xx、**所有位图 naturalWidth > 0** |
| 2 | Lighthouse（见下） |
| 3 | 全站文本对比度 ≥ WCAG AA |
| 4 | 中文里没有孤立的 `—` / `–` |
| 5 | 版式纪律：无 eyebrow、导航单行、链接不折行 |
| 6 | reduced-motion 与 no-WebGL 两套降级各 18 张截图无报错无溢出 |
| 7 | 人工目检占位 |
| 8 | 外链全部可达（5xx / 429 退避重试两次） |
| 9 | 中黑字重子集覆盖：三个断点下没有掉字 |

### 关于 Lighthouse 的两次跑分

CI 与沙箱都没有 GPU，WebGL 走 SwiftShader 软件光栅化。折射 + 色散比普通材质贵得多——`transmission` 每帧要额外渲一遍场景到 RT，`dispersion` 再把这遍拆成三个波长——软件光栅下 TBT 会飙到几十秒。这个数字不代表真机。

所以每个 form factor 跑两次：

- **gated**：`blockedUrlPatterns: ['*three-*.js','*Stage-*.js']`，屏蔽 3D 后卡验收线（桌面 Perf ≥ 90、移动 ≥ 80、LCP < 2.5s）
- **full**：完整加载，只作参考

A11y ≥ 95 与 CLS < 0.1 两项在两次跑分里都卡。当前 gated 成绩：桌面 Perf 100 / LCP 0.41s / TBT 0ms，移动 Perf 97 / LCP 2.04s / TBT 120ms，两端 A11y 96、BP 100、SEO 92、CLS 0。

真机上的成本控制：`transmissionResolutionScale` 桌面 0.5 / 低性能 0.32，dpr 上限 1.7 / 1.4，低性能设备只渲四根晶体并关掉虹彩。首屏动效是纯 CSS 关键帧（`heroRise` / `heroFade`），不等 hydration；Three.js 走 `requestIdleCallback` 动态 import，不在关键路径上。

## 部署

推到 `main` 即触发 `.github/workflows/deploy.yml`（Node 22 → `npm ci` → `npm run build` → `actions/deploy-pages`）。

如果 Actions 没跑起来，去 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。

`vite.config.ts` 里 `base: './'`，产物全是相对路径，将来换自定义域名只要在 `public/` 放一个 `CNAME` 再配 DNS，不用改任何构建配置。

## 降级

- `prefers-reduced-motion: reduce` → 所有入场动画落终态、滚动编排关闭、晶簇以静态姿态渲染
- WebGL 不可用 / 上下文丢失 / 模块加载失败 → `<html class="no-webgl">`，画布隐藏，「主线」那屏的圆孔遮罩同时关掉，版面完整
- 无 JS → 预渲染的首屏 HTML 仍然可读

## 素材

页面上没有任何插画或 3D 模型文件：晶簇是运行时生成的几何体，环境贴图是 canvas 画的。项目封面是三个线上站点的真实 Playwright 截图，不是渲染图。

字体：Inter / Inter Display（OFL）、Noto Sans SC（OFL），均已按站点用字子集化，合计 169 KB。
