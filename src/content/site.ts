/**
 * 全站唯一数据源。
 *
 * 所有数字都能被第三方核验，核实时间 2026-08-23：
 *  - GitHub REST API  /users/88lin 与 /users/88lin/repos?per_page=100（star / fork / 仓库数 / followers）
 *  - blog.88lin.eu.org 首页统计条与标签云（文章数 / 建站天数 / 标签计数）
 *  - video_vip.user.js v3.1.15（解析源数 / 站点适配条数 / @include 条数，逐行数出来的）
 *  - 各仓库 README 与 description（项目文案逐字或据实改写）
 *
 * `npm run verify` 的 A 段会检查产物里的数字与本文件一致、且旧值一个不剩。
 * 刷新方式见 README「数据刷新流程」。
 */

export const AS_OF = '2026.08.23'

/* ---------------------------------------------------------------- 章节 */

/**
 * 色调 = 一整章的地面色。
 *
 * v10 从五档砍到两档。v9 有纸 / 砂 / 蓝 / 黄 / 珊瑚五种地面色，整章刷饱和底，
 * 结果是用户原话的「屎黄色」和「整个页面配色我都不喜欢」—— 一整屏 #EFCE9A
 * 没有任何排版能救。现在只剩两档纸色交替（奶油 / 深奶油），跟 88lin 自己那套
 * 设计系统三个线上站点的做法一致。
 *
 * 深色不再是章级色调，降级成组件：macOS 代码面板、表格深墨表头、notes 章尾那条
 * 短带。深色像素占全页面积的上限由 audit G23 卡在 12%。
 *
 * 硬规则：要放白字的彩色面只能用 --brand-surface / --brand-deep / --pop-surface /
 * --ink；奶油底上的彩色文字只能用 --brand-text / --pop-text / --warning /
 * --danger-strong。亮档 --brand / --pop 只做圆点、描边与 rgba 淡底。
 */
export type Tone = 'paper' | 'alt'

/** 卡片色相。只染卡的边、条与投影，卡面永远是纸，字永远是墨。 */
export type Tint = 'blue' | 'yellow' | 'coral'

export type ChapterId = 'hero' | 'cases' | 'craft' | 'work' | 'garden' | 'notes' | 'contact'

export type Chapter = { id: ChapterId; label: string; tone: Tone; no: string; tint: Tint | 'teal' }

/**
 * 章序：案例提到第 01。
 *
 * v12 的读者要滚过读数、主线、作品三章才看到案例，这和「不滚动三屏之内给出
 * 三个证据」直接冲突。现在开场之后立刻是四个深度案例 —— 招聘方与客户最想看的
 * 就是这个；读数不再单独成章，四个核心数字并进开场的彩色读数卡。
 * 地面色两档交替。
 *
 * tint 只染章头那个巨号编号。六章六个颜色不重复相邻，是为了让整页滚下来有色相节奏
 * ——上一版六个编号全是同一个蓝，从上到下越读越单调，这是「越往下越普通」的一部分。
 */
export const chapters: Chapter[] = [
  { id: 'hero', label: '开场', tone: 'paper', no: '00', tint: 'blue' },
  { id: 'cases', label: '案例', tone: 'alt', no: '01', tint: 'blue' },
  { id: 'craft', label: '主线', tone: 'paper', no: '02', tint: 'coral' },
  { id: 'work', label: '作品', tone: 'alt', no: '03', tint: 'yellow' },
  { id: 'garden', label: '标本馆', tone: 'paper', no: '04', tint: 'teal' },
  { id: 'notes', label: '写作', tone: 'alt', no: '05', tint: 'coral' },
  { id: 'contact', label: '联系', tone: 'paper', no: '06', tint: 'blue' },
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
  sub: '做 Agent 工作流、创意前端与设计系统。下面四个案例都还在线上跑着，每个数字都写了出处，可以自己去核。',
  latin: '88LIN · WORK THAT SHIPPED',
  primaryCta: '聊聊合作',
  secondaryCta: '看四个案例',
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
    value: '4,821',
    label: '累计 Star',
    sub: '25 个原创仓库合计',
    source: 'GET /users/88lin/repos → Σ stargazers_count (fork=false)',
  },
  {
    value: '513',
    label: '被 Fork',
    sub: '有人真的拿去改了',
    source: 'GET /users/88lin/repos → Σ forks_count (fork=false)',
  },
  {
    value: '25',
    label: '原创仓库',
    sub: '另有 81 个 fork，共 106 个公开仓库',
    source: 'GET /users/88lin/repos → count(fork=false)',
  },
  {
    value: '150',
    label: '关注者',
    sub: '没有互关任务，只有 7 个 following',
    source: 'GET /users/88lin → followers',
  },
  {
    value: '56',
    label: '博客文章',
    sub: '工具、教程、资源，写完就能抄走用',
    source: 'blog.88lin.eu.org 首页统计条',
  },
  {
    value: '1,795',
    label: '建站天数',
    sub: '2021 年 9 月至今，没断过',
    source: 'blog.88lin.eu.org 首页统计条',
  },
]

/* ---------------------------------------------------------------- 两条主线 */

export type Track = { id: string; title: string; body: string }

export const tracksIntro = {
  headline: '两条主线，一个交点',
  body: '左边这条负责让 AI 真的能改到线上，右边这条负责让人愿意看、看得懂、用得下去。',
  /**
   * 交点那句单独拎出来，在页面中段做成一整块黄底论点。
   * 原来它是 body 的最后一句，混在灰色说明里；这一页从上到下只有末尾联系那一块
   * 有大色面，中段全是白纸压近白底，读下来会「寡淡」。这块黄是页面唯一的中段色锚。
   */
  thesis: '交点是同一件事：把不确定的能力，接进确定的工程约束里。',
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

/* ---------------------------------------------------------------- 能接什么活 */

/**
 * v9 新增。前八版的第二章一上来就摆仓库，读者先看到的是「他有多少 star」，
 * 而不是「他能替我解决什么」。这三条是把上面两条主线翻译成可以直接下单的东西：
 * 每条写清交付物和适合谁，不引用任何仓库数字。
 */
export type Service = {
  id: string
  no: string
  title: string
  body: string
  deliverables: string[]
  fit: string
  tint: Tint
}

export const servicesIntro = {
  headline: '我能接什么活',
  body: '把上面两条线拆成可以直接开工的三件事。每件都写了交付物，不是「提供技术支持」这种话。',
}

export const services: Service[] = [
  {
    id: 'agent',
    no: '01',
    title: 'Agent 工作流落地',
    body: '把一件反复做的事，变成 Agent 能自己跑完的流程。接你现有的仓库、文档和部署链路，跑完能看见改动，不是只会给建议。',
    deliverables: ['可运行的 Agent Skill', 'MCP 工具接入', '知识库与检索'],
    fit: '适合已经在用 AI 但停在「问答」这一步的团队',
    tint: 'coral',
  },
  {
    id: 'front',
    no: '02',
    title: '创意前端与 WebGL',
    body: '有视觉主张的页面：品牌站、产品发布页、交互叙事。滚动编排、实时渲染、动效降级一并做掉，不是模板换个色。',
    deliverables: ['整站视觉与交互', 'Three.js 场景', '性能预算达标'],
    fit: '适合已经有内容、但页面撑不起内容的项目',
    tint: 'blue',
  },
  {
    id: 'system',
    no: '03',
    title: '设计系统与文档',
    body: '令牌化的色彩、字体、间距与组件，配一套自己能维护下去的文档。交付之后你的人改得动，不用回来找我。',
    deliverables: ['色板与令牌', '组件库与用例', 'Diataxis 文档'],
    fit: '适合多人协作、每次改版都要重画一遍的团队',
    tint: 'yellow',
  },
]

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
  headline: '做过的东西',
  body: '七个还在线上跑着的东西，横着滑。每张卡写清它解决什么、用什么做的、现在什么状态，点卡里的按钮可以直接打开或看源码。',
}

export const projects: Project[] = [
  {
    slug: 'video_vip',
    name: 'video_vip',
    cn: '多平台视频解析脚本',
    year: '2023',
    kind: '长期维护',
    blurb:
      '2023 年写的油猴脚本，现在是我 star 最多的仓库。在视频站播放页挂一枚可拖动的按钮，把播放地址交给第三方解析源换回能播的播放器。当前 16 路解析源可随时切换，22 条站点适配各写自己的容器与遮罩清理规则。',
    stack: ['JavaScript', '油猴脚本', '多端适配'],
    stars: 4686,
    forks: 477,
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
      'macOS 灵动岛式播放器可拖到任意位置，21 个精选电台，打开即听，不用注册也不用下载。五个单键快捷键、专注计时、睡眠定时 15 分钟到 8 小时，支持 PWA 安装。',
    stack: ['Next.js 16', 'React', 'TypeScript', 'PWA'],
    stars: 90,
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
    stars: 8,
    forks: 1,
    state: 'live',
    live: 'https://repair.88lin.eu.org',
    repo: 'https://github.com/88lin/computer-repair-skill',
    tint: 'yellow',
  },
  {
    slug: 'facetmark',
    name: 'facetmark',
    cn: '本地书签检索引擎',
    year: '2026',
    kind: '检索工程',
    blurb:
      '给书签建四条索引（字面、内容、意图、上下文），RRF 融合之后逐维实测，赢的留、输的关。负面结果写进 README，不藏。本地单文件 SQLite，1524 个测试。',
    stack: ['Python', 'SQLite FTS5', 'RRF', 'Local-first'],
    stars: 0,
    forks: 1,
    state: 'live',
    live: 'https://88lin.github.io/facetmark/',
    repo: 'https://github.com/88lin/facetmark',
    tint: 'coral',
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

/**
 * v9：页面不再把 garden 全铺出来。四十块彩色底卡挤成一堵墙，既看不清也不好看，
 * 而且用户本来就有一个导航站在做同一件事。这里每类挑一个能代表能力的，
 * 剩下的交给导航站。挑选原则：避开已经在案例章出现过的项目（Lofi 电台、免费影视），
 * 优先选有真实使用场景、能体现渲染 / 信息设计 / 组件化能力的。
 */
export const gardenPicks = ['3D 圣诞树', '科研海报生成器', '元素周期表', '文字卡片', '音乐站', '植物生长']

export type GardenFeature = GardenItem & { why: string }

const WHY: Record<string, string> = {
  '3D 圣诞树': 'Three.js 实时渲染，粒子与光照全在一块画布里',
  科研海报生成器: '给真实需求做的排版工具，不是玩具 demo',
  元素周期表: '118 个元素的数据密度，靠交互而不是靠滚动读完',
  文字卡片: '设计系统的外显：一套令牌换出十几种卡面',
  音乐站: '内容站的完整形态，播放、列表、状态都自己实现',
  植物生长: 'Notion 内嵌组件，一个 iframe 就能挂进别人的页面',
}

export const gardenFeatured: GardenFeature[] = gardenPicks.map((n) => {
  const hit = garden.find((g) => g.name === n)
  if (!hit) throw new Error(`gardenPicks 里的「${n}」在 garden 中不存在`)
  return { ...hit, why: WHY[n] }
})

export const gardenIntro = {
  headline: '还在跑的小站',
  body: '这些年做的小页面全挂在导航站上，每类挑一个放在这里。没有一个是 demo，链接点开就是线上版本。',
  hub: 'https://88lin.github.io',
  hubLabel: '导航站',
  /** 剩下多少个由数组长度派生，不写死 */
  rest: garden.length - gardenPicks.length,
  total: garden.length,
}

/* ---------------------------------------------------------------- 装备 */

export const stack = {
  headline: '手上有什么',
  body: '不是徽章墙，是这两年交付项目时真正反复用到的那一批。划了底线的那些，出现在下面七个仓库的技术栈里。',
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
    caption: '组件、配色、手绘虚线框，本站用的就是它。色板是 A 组，十组可切。',
    linkLabel: 'components-preview',
    href: 'https://88lin.github.io/mydesign-system/components-preview.html',
  },
  {
    id: 'hub',
    title: '导航站',
    /** 数量由 garden 数组长度派生。v8 这里写死过一个错的「41」，v9 起不许写死。 */
    caption: `${garden.length} 个小站的总入口，按特效、工具、内容、组件四类收口。`,
    linkLabel: '88lin.github.io',
    href: 'https://88lin.github.io',
  },
] as const

export const writing = {
  headline: '写下来的部分',
  body: '博客写的是能直接抄走用的东西：软件资源、AI 工具、效率方法、学习资料。不追热点，追可复用。下面是标签计数，一篇文章可以挂多个标签，所以合计比文章数大。',
  href: 'https://blog.88lin.eu.org',
  hrefLabel: 'blog.88lin.eu.org',
  posts: 56,
  days: 1795,
  /** blog.88lin.eu.org 首页标签云，2026-08-16 抓取 */
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
  /**
   * v9：每篇补上永久链接。v8 只存了标题和日期，页面上就成了六行点不开的死字，
   * 这是实打实的缺陷。链接从 blog.88lin.eu.org/archive 逐条核对，标题一字不差对上。
   */
  latest: [
    { title: '李笑来作品集：6 本书浓缩成一份可执行的人生操作系统', date: '2026-08-10', href: 'https://blog.88lin.eu.org/article/20' },
    { title: 'Adobe 全家桶不限速下载指南', date: '2026-08-08', href: 'https://blog.88lin.eu.org/article/18' },
    { title: '全网 VIP 视频免费看教程', date: '2026-08-06', href: 'https://blog.88lin.eu.org/article/46' },
    { title: '实用生活指南', date: '2026-07-31', href: 'https://blog.88lin.eu.org/article/50' },
    { title: '一键屏蔽流氓软件', date: '2026-07-31', href: 'https://blog.88lin.eu.org/article/12' },
    { title: 'Windows 系统问题排查与修复', date: '2026-07-31', href: 'https://blog.88lin.eu.org/article/44' },
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
