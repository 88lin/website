# DESIGN.md ｜ v11「实验志 Field Notes」

这份文件记录的是**判断**，不是清单。每一条都写清楚：当时看到了什么、为什么这么定、代价是什么。
读者是三个月后的我自己，以及任何要改这套东西的人。

---

## 0. 一句话概念

整个站是**一本实验室笔记本**。页面不是「内容区块」，是八条编号实验（EXP.00–07）；
每条实验有登记序号、量度、结论。数据面板里的数字是标尺刻度，不是装饰线；
卡片上的手写批注是实验记录，不是文案点缀。整站读起来像翻一本手写的工程志。

---

## 1. 从 v1 到 v11：为什么做第 11 版

前九版各有判断但互不继承。v10 把配色拉回设计系统 A 组蓝/柠檬黄/珊瑚红，
解决了 v9 用户反馈的「屎黄色」问题，但版式和组件语言仍然混杂。

v11 做的第一件事：**版式与组件语言对齐自有设计系统**。88lin 自己有
mydesign-system（https://88lin.github.io/mydesign-system），里面每个零件都有名字、
有规格、有用法。v11 不再造轮子，直接搬 CodeMac、specimen-grid、ruler、
hand-drawn frame 等组件。这不是偷懒，是让个人站和设计系统的视觉语言一致——
招聘方点开导航站看到的是同一套东西。

---

## 2. 配色：60/30/10 铁律

配色方案来自 `palettes.css` 的 **Design System A**（`data-palette="A"`）。

| 角色 | 色值 | 用途 | 面积预算 |
|------|------|------|----------|
| 奶油底 `--cream` | `#FEFCF6` | 地面、卡片背景 | ≥ 60% |
| 蓝 `--brand` | `#2B7FD8` | 主色、链接、标题强调 | ~30% |
| 柠檬黄 `--highlight` | `#F4D758` | 标签、批注、量级条 | ≤ 8% |
| 珊瑚红 `--pop` | `#E84A5F` | 朱红印章、少量强调、状态灯 | ≤ 6% |

v9 的教训：整屏饱和底色（`#EFCE9A`）= 用户原话「屎黄色」。
v11 的规则：**彩色只做零件，不做地面**。地面永远是奶油或深奶油两档纸色交替
（`data-tone="paper" | "alt"`），由 `chapters[]` 数组的 `tone` 字段严格交替。

深色像素（`--dark-panel` `#151821`）只出现在 CodeMac 代码面板和表格深墨表头，
由 audit G23 卡在 12% 面积上限。

---

## 3. 排版

| 用途 | 字体 | 来源 |
|------|------|------|
| 展示标题 | Fraunces 900 | Google Fonts，两档拉丁子集共 21 KB，不预载（font-display: swap） |
| 中文正文 | 系统黑体栈 | `-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif` |
| 手写批注 | Caveat | 预加载（首屏旁批），2 KB woff2 |
| 等宽数据 | JetBrains Mono | 标尺刻度、代码面板、量级数据 |

标题用 `clamp()` 响应式：`clamp(2rem, 5vw + 1rem, 4rem)`。
正文 `1.125rem`（18px），行高 `1.65`。
批注文字 `.annot` 用 Caveat，颜色 `--ink-faint`，字号 `0.85em`。

---

## 4. 八章结构

| EXP | id | 标题 | 地面色 | 内容 |
|-----|----|------|--------|------|
| 00 | hero | 开场 | paper | 姓名、角色、一句定义 + Three.js 星图 |
| 01 | metrics | 读数 | alt | 六格量度面板（仓库、文章、脚本接口…），标尺刻度 |
| 02 | craft | 主线 | paper | 能力汇流图 + 双轨服务 + 技术栈网格 |
| 03 | work | 作品 | alt | 横推卡轨（6 仓库，卡宽按 star 对数分配） |
| 04 | cases | 案例 | paper | 三案例详情页（CodeMac 面板 + 流程 + 令牌体系） |
| 05 | garden | 标本馆 | alt | 导航站精选（scene-card 虚线框） |
| 06 | notes | 写作 | paper | 博客入口 + 最近文章 |
| 07 | contact | 联系 | alt | 一句话 + 朱红印章 |

为什么这个顺序：先说能做什么（craft 含三条可承接的服务），仓库和数字退到读数与作品章当证据。
案例在作品后面——你得先知道我做了什么，才能判断案例里的问题怎么解。
标本馆和写作是「还有这些」，联系是收尾。EXP 编号承载信息：它是这本志的登记序号。

---

## 5. 3D 星图（Atlas）

`Atlas` 组件渲染一个 Three.js 星座图，展示六个核心仓库的关系网络。

### 技术实现

- **双层渲染**：静态 SVG 始终在 DOM（确保首屏可读），WebGL canvas 在桌面端叠加
- **动态导入**：Three.js 通过 `React.lazy` + `import()` 加载（~122KB gz），不在首屏包
- **确定性布局**：mulberry32 PRNG 生成器，同一种子 → 同一布局（SVG 和 WebGL 位置完全同步）
- **标签碰撞避免**：`orbitLabelPoints()` 对每条轨道搜索 32 个候选角度，贪心选择距所有障碍物最远的点

### 数据驱动

`src/lib/atlas.ts` 定义星图数据结构：
- `StarNode`：每个仓库节点（位置、半径、颜色、标签）
- `OrbitEdge`：轨道连线（hub → 节点的角度和距离）
- `SHORT` 映射：短名显示（lofi / repair / gzh / diataxis / wesum）

### 性能约束

- Three.js 包体单独 chunk（`atlas-[hash].js`，~482 KB raw / ~122 KB gz）
- 移动端只渲染 SVG（零 WebGL 开销）
- `useMediaQuery(WIDE_MQ)` 控制是否挂载 canvas

---

## 6. 关键组件

### CodeMac（代码面板）
macOS 窗口样式的代码面板，规格逐条照抄 88lin 设计系统：
- 12px 圆角、隐藏溢出、40px 模糊投影
- 标题栏 `#2D2D3A` + 11px 三色圆点 + 等宽文件名
- 面体 `#1A1B26`，内距 22px
- 语法色 Tokyo Night（**全站唯一允许写死色值的地方之一**）
- 全页唯一的深色实体，充当奶油底的视觉锚点
- 内容用词法记号数组 `Tok[]`，不用正则高亮（中文注释不误伤）

### 手绘边框系统
Catmull-Rom 样条 → 三阶 Bézier，用 SVG `<path>` 绘制不规则边框。
用于案例页的「实验志」封面效果。

### 朱红印章
`data-stamp` 属性标记的元素渲染为朱红色圆形印章，
`--pop` 色值 + `transform: rotate(-12deg)`。品牌签名零件。

### 量度面板（Metrics）
六格网格，每格一个数字 + 标签 + 来源脚注。
背景色 `--cream-dark`（深奶油），数字用 Fraunces 900。
标尺刻度 `.ruler` 用 SVG 绘制毫米级刻度线。

---

## 7. 动效体系

### 视差（pointer bus）
`src/lib/bus.ts` — rAF 合帧的指针广播。
`pointermove` 在高刷屏上一秒 240 次，合帧后一帧最多写一次。
订阅者：`Hero` 首屏截图的 CSS transform。

### 滚动揭示
`useReveal` + `useStagger`（`src/lib/motion.ts`）。
元素进入视口时添加 `.is-in` 类触发 CSS transition。
`prefers-reduced-motion: reduce` 时跳过所有动画。

### 横推卡轨（Work 章节）
GSAP ScrollTrigger pin + 水平平移。
卡宽按 star 数的对数分配（24rem 起，最多加 12rem）。
`useMediaQuery(WIDE_MQ)` 控制：≤900px 不 pin，竖排展示。

---

## 8. 静态生成

构建管线：`build:client` → `build:ssr` → `prerender`

```
tsc -b --noCheck && vite build          # 客户端
vite build --ssr src/entry-server.tsx   # SSR bundle
node scripts/prerender.mjs             # 生成 HTML
```

四条路由预渲染：
- `/` → 首页（~69 KB）
- `/case/lofi/` → lofi 案例页（~13.5 KB）
- `/case/repair/` → repair 案例页（~13.7 KB）
- `/case/video-vip/` → video-vip 案例页（~14.7 KB）

部署到 GitHub Pages：`https://88lin.github.io/website/`

---

## 9. Token 纪律

所有颜色**只能**来自 `palettes.css` 的语义 token。禁止：
- 在组件或业务 CSS 中写死 hex 值（CodeMac 的 Tokyo Night 语法色是唯一例外）
- 引用 palette 字母（`A` / `B`），只引用角色名（`--brand` / `--highlight` / `--pop`）
- 用 `rgba()` 拼接非 token 的色值

切换配色只需改 `<html data-palette="A">` 的字母，全站自动跟随。

---

## 10. 审计与质量

`scripts/audit.mjs` 包含全站质量检查：
- 8 个章节必须存在
- 纸色交替验证
- 深色面积 ≤ 12%
- 每个案例页有 CodeMac 面板
- 所有数字可被 GitHub API / 站点统计核实

`scripts/geom-audit.mjs` 专门检查星图标签碰撞。

---

## 11. 代价与已知限制

1. **Three.js 包体大**：~122 KB gz。但它是动态导入的，移动端不加载，首屏不受影响。
2. **只有一版配色**：v11 锁定 Design System A。切换到 B-J 只需改 HTML 属性，但 v11 的 60/30/10 比例是为 A 组调的，其它 palette 可能需要重新平衡。
3. **SSR 中 Three.js 不执行**：`entry-server.tsx` 不导入 WebGL 模块，预渲染输出只有 SVG。
4. **横推卡轨在 ≤900px 降级为竖排**：这是有意的设计决策，不是 bug。
5. **数据截止 2026-08-16**：`site.ts` 中的所有数字需要定期刷新，`npm run audit` 会比对。

---

## 12. 关键文件索引

| 文件 | 职责 |
|------|------|
| `src/styles/palettes.css` | 配色 token（vendor from mydesign-system） |
| `src/styles/index.css` | 全站样式（组件 + 响应式 + 动效） |
| `src/content/site.ts` | 全站唯一数据源（数字、文案、章节定义） |
| `src/lib/atlas.ts` | 星图数据结构与碰撞避免算法 |
| `src/lib/bus.ts` | rAF 合帧指针总线 |
| `src/lib/motion.ts` | 滚动揭示 + GSAP 场景管理 |
| `src/lib/bp.ts` | 响应式断点常量 |
| `src/components/Atlas.tsx` | 星图 SVG 渲染 |
| `src/components/CodeMac.tsx` | macOS 代码面板 |
| `src/components/Ink.tsx` | 手写批注、标尺等墨水零件 |
| `src/sections/` | 八章组件 |
| `src/pages/CasePage.tsx` | 案例页路由 |
| `scripts/prerender.mjs` | 静态 HTML 预渲染 |
| `scripts/audit.mjs` | 全站质量审计 |
