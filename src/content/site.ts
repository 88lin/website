/**
 * 全站唯一数据源。
 *
 * 所有数字都能被第三方核验，核实时间 2026-08-10：
 *  - GitHub REST API  /users/88lin 与 /users/88lin/repos?per_page=100（star / fork / 仓库数 / followers）
 *  - blog.88lin.eu.org 首页统计条与标签云（文章数 / 建站天数 / 标签计数）
 *  - video_vip.user.js v3.1.10（解析接口数 / 站点适配器数 / @include 条数，逐行数出来的）
 *  - 各仓库 README 与 description（项目文案逐字或据实改写）
 *
 * `npm run audit` 的第 8 关会重新拉一次上面这些源，跟本文件逐个比对，
 * 对不上就红。刷新方式见 README「数据刷新」。
 */

export const AS_OF = '2026.08.10'

/* ---------------------------------------------------------------- 章节 */

/**
 * 色调 = 一整章的地面色。全部指向 palettes.css 的 A 组（Classic 蓝 / 黄 / 珊瑚），
 * 组件永远写角色名，不写色值，也不写调色板字母。
 *
 * 硬规则：要放正文的彩色面只能用 -deep 档（blue / coral），
 * 亮档 --brand / --pop 只做大字、描边与纯色块。对比度在 styles/index.css 里注明。
 */
export type Tone = 'paper' | 'sand' | 'blue' | 'yellow' | 'coral'

/** 卡片色相。只染卡的边、条与投影，卡面永远是纸，字永远是墨。 */
export type Tint = 'blue' | 'yellow' | 'coral'

export type ChapterId = 'hero' | 'work' | 'cases' | 'craft' | 'notes' | 'contact'

export type Chapter = { id: ChapterId; label: string; tone: Tone }

/**
 * 六章。v6 是八章一个模子，差异只有列数；v7 砍到六章，并且强制每章换一种构图：
 * 分屏海报 / 横向图廊 / 粘性堆叠 / 无卡片对角线 / 分组横滚 / 满幅色块。
 * 章间的构图特征向量在 audit G16 里逐对比距离，撞型即红。
 *
 * 地面色节奏：纸 → 蓝 → 砂 → 黄 → 纸 → 珊瑚。
 */
export const chapters: Chapter[] = [
  { id: 'hero', label: '开场', tone: 'paper' },
  { id: 'work', label: '作品', tone: 'blue' },
  { id: 'cases', label: '怎么做的', tone: 'sand' },
  { id: 'craft', label: '手艺', tone: 'yellow' },
  { id: 'notes', label: '在写', tone: 'paper' },
  { id: 'contact', label: '联系', tone: 'coral' },
]

/* ---------------------------------------------------------------- 身份 */

export const profile = {
  name: '茉灵智库',
  handle: '88lin',
  role: 'AI 研究者与 Agent 工程实践者',
  latinTagline: 'Turning frontier AI into shipped, maintainable engineering.',
  location: '中国 · 浙江',
  since: '2022',
  githubSince: '2022-08-13',
}

export const hero = {
  line1: '把前沿 AI 变成',
  line2Pre: '可',
  line2Mark: '交付',
  line2Mid: '、可',
  line2Circle: '维护',
  line3: '的工程结果。',
  sub: '接口会挂，平台会变，需求会改。我做的东西按「可切换」设计，所以到今天还活着。',
  latin: '88LIN · WORK THAT SHIPPED',
  primaryCta: '聊聊合作',
  secondaryCta: '看三个案例',
}

export const CTA_LABEL = '聊聊合作'
export const CONTACT_EMAIL = '431761794@qq.com'
export const CONTACT_HREF = 'mailto:431761794@qq.com?subject=%E5%90%88%E4%BD%9C%E5%92%A8%E8%AF%A2'

/* ---------------------------------------------------------------- 读数 */

export type Metric = {
  value: string
  unit?: string
  label: string
  sub: string
  /** 这个数从哪来，鼠标移上去与案例页的「数字出处」都用它 */
  source: string
}

export const metricsIntro = {
  headline: '先看数',
  body: '这一屏没有一个数是形容词。每个数都写着它从哪个接口取的，你可以自己去拉一遍。',
}

export const metrics: Metric[] = [
  {
    value: '4,684',
    label: '累计 Star',
    sub: '22 个原创仓库合计',
    source: 'GET /users/88lin/repos → Σ stargazers_count (fork=false)',
  },
  {
    value: '502',
    label: '被 Fork',
    sub: '有人真的拿去改了',
    source: 'GET /users/88lin/repos → Σ forks_count (fork=false)',
  },
  {
    value: '22',
    label: '原创仓库',
    sub: '另有 81 个 fork，共 103 个公开仓库',
    source: 'GET /users/88lin/repos → count(fork=false)',
  },
  {
    value: '144',
    label: '关注者',
    sub: '没有互关任务，只有 7 个 following',
    source: 'GET /users/88lin → followers',
  },
  {
    value: '55',
    label: '博客文章',
    sub: '工具、教程、资源，写完就能抄走用',
    source: 'blog.88lin.eu.org 首页统计条',
  },
  {
    value: '1,784',
    label: '建站天数',
    sub: '2022 年 8 月 13 日至今，没断过',
    source: 'blog.88lin.eu.org 首页统计条',
  },
]

/* ---------------------------------------------------------------- 两条主线 */

export type Track = { id: string; title: string; body: string }

export const tracksIntro = {
  headline: '两条主线，一个交点',
  body: '左边这条负责让 AI 真的能改到线上，右边这条负责让人愿意看、看得懂、用得下去。交点是同一件事：把不确定的能力，接进确定的工程约束里。',
}

export const trackA = {
  id: 'A',
  title: 'AI Agent 工程',
  items: [
    {
      id: 'agent',
      title: 'Agent 工程化',
      body: 'Codex / Claude Code / OpenClaw 多智能体协同：代码阅读、开发实现、测试验证、Code Review 与 GitHub 长期维护。',
    },
    {
      id: 'mcp',
      title: 'MCP 与工具链',
      body: '打通浏览器、GitHub、Notion、文档与部署工具，让 Agent 真的能改到线上，而不是只会写建议。',
    },
    {
      id: 'rag',
      title: '知识库与 RAG',
      body: '把项目文档、Issue、FAQ 与设计规范沉淀为可检索知识库，让答案有出处、可复核。',
    },
  ] as Track[],
}

export const trackB = {
  id: 'B',
  title: '创意前端',
  items: [
    {
      id: 'webgl',
      title: 'WebGL 与实时渲染',
      body: 'Three.js 场景、自定义着色器、GPGPU 粒子与色散折射。用一块画布承载整页叙事，而不是堆插件。',
    },
    {
      id: 'system',
      title: '交互与视觉系统',
      body: '令牌化的色彩、字体与间距，滚动编排与状态反馈成体系，改一处不会崩全站。',
    },
    {
      id: 'perf',
      title: '性能与可访问性',
      body: '预算先行：LCP、CLS、包体积、对比度与减弱动效降级，全部在构建期用脚本卡住。',
    },
  ] as Track[],
}

/* ---------------------------------------------------------------- 作品通道 */

export type ProjectState = 'live' | 'maintained' | 'archived'

export type Project = {
  slug: string
  name: string
  cn: string
  year: string
  kind: string
  blurb: string
  stack: string[]
  stars: number
  forks: number
  state: ProjectState
  live?: string
  repo: string
  tint: Tint
}

export const worksIntro = {
  headline: '作品通道',
  body: '六路，按 star 排，卡片宽度就是它的分量。状态灯是真的：还在改的亮着，只维护不加功能的是待机。',
}

export const projects: Project[] = [
  {
    slug: 'video_vip',
    name: 'video_vip',
    cn: '多平台视频解析脚本',
    year: '2023',
    kind: '长期维护',
    blurb:
      '2023 年写的油猴脚本，现在是我 star 最多的仓库。18 路解析接口可以随时切换，22 个站点各有独立的播放器容器与遮罩清理规则。它教会我的是：接口一定会挂，可切换才是功能。',
    stack: ['JavaScript', '油猴脚本', '多端适配'],
    stars: 4581,
    forks: 471,
    state: 'maintained',
    live: 'https://88lin.github.io/vip/',
    repo: 'https://github.com/88lin/video_vip',
    tint: 'coral',
  },
  {
    slug: 'lofi-radio-web',
    name: 'Lofi Radio Web',
    cn: '专注场景的网页电台',
    year: '2026',
    kind: '创意前端',
    blurb:
      'macOS 灵动岛式播放器，21 个精选电台，打开即听，不用注册也不用下载。支持 PWA 安装、睡眠定时与专注时钟。',
    stack: ['Next.js 16', 'React', 'TypeScript', 'PWA'],
    stars: 88,
    forks: 23,
    state: 'live',
    live: 'https://lofi.88lin.eu.org',
    repo: 'https://github.com/88lin/lofi-radio-web',
    tint: 'blue',
  },
  {
    slug: 'computer-repair-skill',
    name: 'Computer Repair Skill',
    cn: '跨平台电脑维修 Agent',
    year: '2026',
    kind: 'Agent 工程',
    blurb:
      '让 Agent 像一名谨慎的维修工程师：62 个按需加载的 Playbook，覆盖 Windows / macOS / Linux 的诊断、清理、性能、网络与安全维护。先取证，再计划，确认后修改。',
    stack: ['Agent Skill', 'Python', 'Markdown', 'AGPL-3.0'],
    stars: 7,
    forks: 1,
    state: 'live',
    live: 'https://repair.88lin.eu.org',
    repo: 'https://github.com/88lin/computer-repair-skill',
    tint: 'yellow',
  },
  {
    slug: 'gzh-design-skill',
    name: 'gzh-design-skill',
    cn: '公众号排版技能',
    year: '2026',
    kind: 'Agent 工程',
    blurb:
      '把 Markdown 一键排成能直接粘进公众号编辑器的 HTML。8 套主题加一个主题生成器，样式全内联不掉格式，两道脚本关卡校验。',
    stack: ['Agent Skill', 'HTML', 'Python Lint'],
    stars: 0,
    forks: 0,
    state: 'live',
    live: 'https://88lin.github.io/gzh-design-skill/docs/gallery/index.html',
    repo: 'https://github.com/88lin/gzh-design-skill',
    tint: 'coral',
  },
  {
    slug: 'diataxis-docs-skill',
    name: 'diataxis-docs-skill',
    cn: '技术文档四象限技能',
    year: '2026',
    kind: 'Agent 工程',
    blurb:
      '基于 Diataxis 框架的文档写作、分类、拆分与审查技能：让 Agent 判断一篇文档到底该是教程、指南、参考还是解释。',
    stack: ['Agent Skill', 'Diataxis', 'Python'],
    stars: 2,
    forks: 0,
    state: 'maintained',
    repo: 'https://github.com/88lin/diataxis-docs-skill',
    tint: 'blue',
  },
  {
    slug: 'wesum-wechat-monitor',
    name: 'WeSum',
    cn: '公众号智能摘要推送',
    year: '2026',
    kind: 'AI 管道',
    blurb: '微信公众号内容监控与智能摘要推送助手，把一堆订阅源压成每天可读的结构化简报。',
    stack: ['Python', 'LLM', '定时任务'],
    stars: 2,
    forks: 6,
    state: 'maintained',
    repo: 'https://github.com/88lin/wesum-wechat-monitor',
    tint: 'yellow',
  },
]

/* ---------------------------------------------------------------- 数字花园 */

export type GardenGroup = '特效' | '工具' | '内容' | '组件'
export type GardenItem = { name: string; href: string; group: GardenGroup }

const GH = 'https://88lin.github.io/'

export const garden: GardenItem[] = [
  { name: '烟花 I', href: GH + 'fireworks/', group: '特效' },
  { name: '烟花 II', href: GH + 'fireworks1/', group: '特效' },
  { name: '烟花 III', href: GH + 'fireworks2/', group: '特效' },
  { name: '烟花 IV', href: GH + 'fireworks3/', group: '特效' },
  { name: '烟花 V', href: GH + 'fireworks4/', group: '特效' },
  { name: '粒子圣诞树', href: GH + 'Christmas/', group: '特效' },
  { name: '3D 圣诞树', href: GH + 'christmas-tree/', group: '特效' },
  { name: '圣诞场景', href: GH + 'Christmas1/', group: '特效' },
  { name: '圣诞贺卡', href: GH + 'Christmas2/', group: '特效' },
  { name: '圣诞礼盒', href: GH + 'Christmas3/', group: '特效' },
  { name: '生日快乐', href: GH + 'birthday/', group: '特效' },
  { name: '表白代码 I', href: GH + 'love1/', group: '特效' },
  { name: '表白代码 II', href: GH + 'love2/', group: '特效' },
  { name: '表白代码 III', href: GH + 'love3/', group: '特效' },

  { name: '古诗起名', href: GH + 'gushi/dist/', group: '工具' },
  { name: '科研海报生成器', href: GH + 'academic-poster-generator/', group: '工具' },
  { name: 'AI 模型检测', href: GH + 'ai-model-checker.html', group: '工具' },
  { name: '房贷计算器', href: GH + 'Mortgage-Calculator/', group: '工具' },
  { name: '论文降重', href: GH + 'jiangchong/', group: '工具' },
  { name: '外放干扰器', href: GH + 'stop/', group: '工具' },
  { name: '闲鱼敏感词加密', href: GH + 'xy/', group: '工具' },
  { name: '打印纸设计', href: GH + 'PaperStudio', group: '工具' },
  { name: '文字卡片', href: GH + 'TextCard-Studio', group: '工具' },
  { name: '元素周期表', href: GH + 'Periodic-table-web', group: '工具' },
  { name: '电子礼簿', href: GH + 'gift-ledger', group: '工具' },
  { name: '深度研究', href: 'https://research.88lin.eu.org', group: '工具' },
  { name: '知识分享', href: 'https://learn.88lin.eu.org', group: '工具' },

  { name: 'Lofi 电台', href: 'https://lofi.88lin.eu.org', group: '内容' },
  { name: '免费影视', href: GH + 'vip/', group: '内容' },
  { name: '免费短剧', href: GH + 'duanju/', group: '内容' },
  { name: '音乐站', href: GH + 'Music/', group: '内容' },
  { name: '瀑布流图片', href: GH + 'bbl/', group: '内容' },
  { name: '公众号', href: 'https://go.88lin.eu.org/gzh', group: '内容' },

  { name: '显示时间', href: GH + 'notion/2/', group: '组件' },
  { name: '倒计时', href: GH + 'notion/3/', group: '组件' },
  { name: '计时器', href: GH + 'notion/8/', group: '组件' },
  { name: '音乐热歌', href: GH + 'notion/6/', group: '组件' },
  { name: '一言古诗', href: GH + 'notion/shici/', group: '组件' },
  { name: '植物生长', href: GH + 'notion/1/', group: '组件' },
  { name: '窗外动画', href: GH + 'notion/7/', group: '组件' },
]

export const gardenIntro = {
  headline: '数字花园',
  body: '这些年顺手做的小页面：特效、工具、Notion 组件、内容站。没有一个是 demo，全都还挂在线上跑着。',
  hub: 'https://88lin.github.io',
  hubLabel: '导航站',
}

/* ---------------------------------------------------------------- 装备 */

export const stack = {
  headline: '手上有什么',
  body: '不是徽章墙，是这两年交付项目时真正反复用到的那一批。划了底线的那些，出现在下面六个仓库的技术栈里。',
  clusters: [
    {
      id: 'ai',
      title: 'AI 与 Agent',
      items: ['OpenAI', 'Anthropic Claude', 'Gemini', 'Ollama', 'MCP', 'Agent Skills', 'RAG', 'Hugging Face', 'PyTorch'],
    },
    {
      id: 'front',
      title: '前端与图形',
      items: ['TypeScript', 'React', 'Vue', 'Next.js', 'Astro', 'Three.js', 'GSAP', 'Tailwind', 'Vite', 'PWA'],
    },
    {
      id: 'back',
      title: '服务端与数据',
      items: ['Node.js', 'Python', 'Java / Spring', 'Go', 'PostgreSQL', 'MySQL', 'Redis', 'MongoDB', 'SQLite'],
    },
    {
      id: 'ops',
      title: '工程与交付',
      items: ['Git', 'GitHub Actions', 'Docker', 'Kubernetes', 'Nginx', 'Cloudflare', 'ESLint', 'Playwright'],
    },
  ],
}

/* ---------------------------------------------------------------- 写作 */

/** 手艺章的证据条：两张真实页面，横条裁切，不做成卡片。 */

/**
 * 手艺章的两处实物。v8 起零位图：这里不再存截图名，只存链接与说明，
 * 版面上的图形由组件现画 SVG，画的是真实结构（色板取自 palettes.css 的 A 组，
 * 节点图画的是导航站实际收录的四类小站）。
 */
export const craftEvidence = [
  {
    id: 'ds',
    title: '自建设计系统',
    caption: '组件、配色、手绘虚线框，本站用的就是它。色板是 A 组 Classic，十组可切。',
    linkLabel: 'components-preview',
    href: 'https://88lin.github.io/mydesign-system/components-preview.html',
  },
  {
    id: 'hub',
    title: '导航站',
    caption: '41 个小站的总入口，按特效、工具、内容、组件四类收口。',
    linkLabel: '88lin.github.io',
    href: 'https://88lin.github.io',
  },
] as const

export const writing = {
  headline: '写下来的部分',
  body: '博客写的是能直接抄走用的东西：软件资源、AI 工具、效率方法、学习资料。不追热点，追可复用。下面是标签计数，一篇文章可以挂多个标签，所以合计比文章数大。',
  href: 'https://blog.88lin.eu.org',
  hrefLabel: 'blog.88lin.eu.org',
  posts: 55,
  days: 1784,
  /** blog.88lin.eu.org 首页标签云，2026-08-10 抓取 */
  tags: [
    { name: '工具', count: 29 },
    { name: '教程', count: 24 },
    { name: '热门', count: 13 },
    { name: '软件资源', count: 11 },
    { name: '必看', count: 9 },
    { name: 'AI工具', count: 8 },
    { name: '生活', count: 8 },
    { name: '健康', count: 6 },
    { name: '个人成长', count: 4 },
    { name: '思考', count: 4 },
    { name: '省钱攻略', count: 3 },
    { name: '学术论文', count: 3 },
    { name: '学习工具', count: 3 },
  ],
  tagTotal: 27,
  latest: [
    { title: 'Adobe 全家桶不限速下载指南', date: '2026-08-08' },
    { title: '全网 VIP 视频免费看教程', date: '2026-08-06' },
    { title: '实用生活指南', date: '2026-07-31' },
    { title: '一键屏蔽流氓软件', date: '2026-07-31' },
    { title: 'Windows 系统问题排查与修复', date: '2026-07-31' },
    { title: '电脑蓝屏终极解决办法', date: '2026-07-31' },
  ],
}

/* ---------------------------------------------------------------- 接入 */

export const contact = {
  headline: '有想做的东西？',
  body: '前端交互、WebGL 视觉、Agent 工作流与知识库落地，都可以直接聊。写清楚你想解决什么问题，我会回一份可执行的判断，不收咨询费。',
  primary: { label: '邮箱', value: CONTACT_EMAIL, href: CONTACT_HREF },
  channels: [
    { id: 'github', label: 'GitHub', value: '@88lin', href: 'https://github.com/88lin' },
    { id: 'blog', label: '博客', value: 'blog.88lin.eu.org', href: 'https://blog.88lin.eu.org' },
    { id: 'bilibili', label: '哔哩哔哩', value: 'Hathaway', href: 'https://space.bilibili.com/1412014683' },
    { id: 'wechat', label: '公众号', value: '茉灵智库', href: 'https://go.88lin.eu.org/gzh' },
    { id: 'hub', label: '导航站', value: '88lin.github.io', href: 'https://88lin.github.io' },
  ],
}

export const footer = {
  copyright: '© 2023-2026 茉灵智库 · 88lin',
  note: '本站由 Vite + React + GSAP 构建，页面上每个数字都来自公开接口，源码开源。',
  source: 'https://github.com/88lin/website',
  asOf: AS_OF,
}
