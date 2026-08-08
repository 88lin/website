# 茉灵智库 · 个人主页与作品集

Vite + React + Three.js + GSAP。信号朱红 × 钴蓝双色系统，全站零圆角，一块全屏 WebGL 画布贯穿九个分区。

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
src/webgl/               Stage / ChromeForm / ParticleField / SubjectPlane / env
src/lib/motion.ts        GSAP + ScrollTrigger 封装，统一处理 prefers-reduced-motion
src/lib/asset.ts         静态资源相对路径（勿改回 import.meta.env.BASE_URL，见文件内注释）
src/styles/index.css     设计令牌、@font-face、首屏 CSS 关键帧
scripts/                 字体子集、封面截图、静态文件、预渲染、截图、验收
```

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
node scripts/prep-assets.mjs    # 主体素材转 webp，输出 public/subjects/*.webp
node scripts/static.mjs         # favicon / og.png / robots.txt / sitemap.xml / 404.html

node scripts/display-chars.mjs  # 从构建产物采集真正用标题字渲染的字符
python3 scripts/subset-fonts.py # 按该字符集子集化字体
```

标题字（得意黑）只挂在 `.display` 上，所以子集只装那 107 个汉字，20.8 KB 而不是 100 KB。**改了任何 `.display` 文案就要重跑上面两条**，否则新字会掉回系统字体——验收第 9 项会替你抓住这个。

## 验收

```bash
npm run build
node scripts/shots.mjs /workspace/shots            # 目检用截图，9 个滚动位 × 2 视口
node scripts/shots.mjs /workspace/shots-reduced  --reduced
node scripts/shots.mjs /workspace/shots-nowebgl  --nowebgl
SHOTS_DIR=/workspace/shots node scripts/audit.mjs
```

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
| 9 | 标题字子集覆盖：三个断点下没有掉字 |

### 关于 Lighthouse 的两次跑分

CI 与沙箱都没有 GPU，WebGL 走 SwiftShader 软件光栅化，17000 粒子 + 30 阶细分的虹彩物理材质每帧要吃掉主线程几百毫秒，TBT 直接飙到 8～24 秒。这个数字不代表真机。

所以每个 form factor 跑两次：

- **gated**：`blockedUrlPatterns: ['*three-*.js','*Stage-*.js']`，屏蔽 3D 后卡验收线（桌面 Perf ≥ 90、移动 ≥ 80、LCP < 2.5s）
- **full**：完整加载，只作参考

A11y ≥ 95 与 CLS < 0.1 两项在两次跑分里都卡。当前：桌面 Perf 100 / LCP 0.41s，移动 Perf 99 / LCP 1.83s，A11y 96、BP 100、SEO 92、CLS 0。

首屏动效是纯 CSS 关键帧（`heroRise` / `heroFade`），不等 hydration；Three.js 走 `requestIdleCallback` 动态 import，不在关键路径上。关键路径约 115 KB gzip。

## 部署

推到 `main` 即触发 `.github/workflows/deploy.yml`（Node 22 → `npm ci` → `npm run build` → `actions/deploy-pages`）。

如果 Actions 没跑起来，去 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。

`vite.config.ts` 里 `base: './'`，产物全是相对路径，将来换自定义域名只要在 `public/` 放一个 `CNAME` 再配 DNS，不用改任何构建配置。

## 降级

- `prefers-reduced-motion: reduce` → 所有入场动画落终态、滚动编排关闭、Three.js 以静态姿态渲染
- WebGL 不可用 / 上下文丢失 / 模块加载失败 → `<html class="no-webgl">`，画布隐藏，主体素材改用 `<img>`，版面完整
- 无 JS → 预渲染的首屏 HTML 仍然可读

## 素材

小猫、小兔、机器人、汽车四张主体图由 AI 生成，映射到 WebGL 里的曲面平面上（带桶形形变、通道分离与椭圆羽化）；窄屏退化成 `<img>`。项目封面是三个线上站点的真实 Playwright 截图，不是渲染图。

字体：得意黑 Smiley Sans（OFL）、Geist / Geist Mono（OFL），均已按站点用字子集化。
