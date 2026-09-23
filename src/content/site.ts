/* 全站唯一数据源。 */

export const AS_OF = '2026.09.21'

/* ---------------------------------------------------------------- 章节 */

export type Tone = 'paper' | 'alt'
export type Tint = 'blue' | 'yellow' | 'coral'
export type ChapterId = 'hero' | 'services' | 'cases' | 'work' | 'craft' | 'notes' | 'contact'
export type Chapter = { id: ChapterId; label: string; tone: Tone; no: string; tint: Tint | 'teal' }

/** 地面色两档交替；tint 只染章头那个巨号编号，相邻不重复。 */
export const chapters: Chapter[] = [
  { id: 'hero', label: '开场', tone: 'paper', no: '00', tint: 'blue' },
  { id: 'services', label: '服务', tone: 'alt', no: '01', tint: 'coral' },
  { id: 'cases', label: '案例', tone: 'paper', no: '02', tint: 'blue' },
  { id: 'work', label: '作品', tone: 'alt', no: '03', tint: 'yellow' },
  { id: 'craft', label: '主线', tone: 'paper', no: '04', tint: 'teal' },
  { id: 'notes', label: '写作', tone: 'alt', no: '05', tint: 'coral' },
  { id: 'contact', label: '联系', tone: 'paper', no: '06', tint: 'blue' },
]

/* ---------------------------------------------------------------- 身份 */

export const profile = {
  name: '茉灵智库',
  handle: '88lin',
  role: 'AI Agent 工程实践者 · 独立开发者',
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
  sub: '独立开发者，长期写开源、也长期接单。跑不起来的仓库、做不完的重复劳动、撑不起内容的页面，都可以直接发我。下面六件活写清了交付物，页面上每个数字都写了出处，可以自己去核。',
  latin: '88LIN · WORK THAT SHIPPED',
  primaryCta: '说说你的需求',
  secondaryCta: '看能接什么活',
}

export const CTA_LABEL = '说说你的需求'
export const CONTACT_EMAIL = '431761794@qq.com'
export const CONTACT_HREF = 'mailto:431761794@qq.com?subject=%E5%90%88%E4%BD%9C%E5%92%A8%E8%AF%A2'

/** 导航站。那批小站只留这一枚入口，不在官网再抄一份目录。 */
export const hub = {
  href: 'https://go.88lin.eu.org/',
  label: 'go.88lin.eu.org',
  title: '数字花园导航',
  blurb: '这些年做的小页面、工具与节日特效都收在那儿，按用途分了十类。',
}

/* ---------------------------------------------------------------- 读数 */

export type Metric = {
  /** 页面按 id 取值，不按数组下标 —— 下标一动就会取错一格。 */
  id: 'stars' | 'forks' | 'repos' | 'followers' | 'posts' | 'tags'
  value: string
  unit?: string
  label: string
  sub: string
  source: string
}

export const metrics: Metric[] = [
  {
    id: 'stars',
    value: '6,053',
    label: '累计 Star',
    sub: '30 个原创仓库合计',
    source: 'GET /users/88lin/repos → Σ stargazers_count (fork=false)',
  },
  {
    id: 'repos',
    value: '30',
    label: '原创仓库',
    sub: '另有 88 个 fork，共 118 个公开仓库',
    source: 'GET /users/88lin/repos → count(fork=false)',
  },
  {
    id: 'forks',
    value: '614',
    label: '被 Fork',
    sub: '有人真的拿去改了',
    source: 'GET /users/88lin/repos → Σ forks_count (fork=false)',
  },
  {
    id: 'followers',
    value: '180',
    label: '关注者',
    sub: '没有互关任务，只有 7 个 following',
    source: 'GET /users/88lin → followers',
  },
  {
    id: 'posts',
    value: '56',
    label: '博客文章',
    sub: '工具、教程、资源，写完就能抄走用',
    source: 'blog.88lin.eu.org 首页统计条',
  },
  {
    id: 'tags',
    value: '27',
    label: '文章标签',
    sub: '一篇可挂多个，所以合计比文章数大',
    source: 'blog.88lin.eu.org 首页标签云条目数',
  },
]

export const metric = (id: Metric['id']): Metric => {
  const hit = metrics.find((m) => m.id === id)
  if (!hit) throw new Error(`metrics 里没有「${id}」`)
  return hit
}

/* ---------------------------------------------------------------- 能接什么活 */

export type Service = {
  id: string
  no: string
  title: string
  body: string
  /** 关键词条：客户按这些词对号入座，页面上这一行最重 */
  does: string[]
  deliver: string
  fit: string
  tint: Tint
}

export const servicesIntro = {
  headline: '我能接什么活',
  body: '六件可以直接开工的事。每件都写了具体能做什么、交付什么、适合谁 —— 你对着找自己那一条就行。',
  priceLabel: '按需求报价',
  priceNote: '先聊清楚再开工。说明问题、判断可行性这一段不收费，做不了会直接说做不了。',
}

export const services: Service[] = [
  {
    id: 'repo',
    no: '01',
    title: 'GitHub 项目跑通与二次开发',
    body: '拿到一个开源仓库装不起来、跑到一半报错、或者想改成自己要的样子，都可以直接丢过来。我自己维护着 30 个原创仓库，踩环境的坑踩得够多。',
    does: ['代码复现', '环境部署', '依赖报错', 'Git 冲突', '二次开发', '前端美化', 'Bug 排查', '功能修改'],
    deliver: '能跑起来的环境、一份从零开始的复现步骤、改动说明',
    fit: '手上有 repo 但装不起来，或者需要在别人的代码上继续改的人',
    tint: 'coral',
  },
  {
    id: 'oss',
    no: '02',
    title: '开源贡献协助（Issue / PR）',
    body: '带你在万星级仓库完成一次真实、可追溯的开源贡献，最后出现在仓库的 Contributor 列表里。可以指定仓库，也可以由我按你的方向推荐。',
    does: ['选仓库', '找 Issue', '写 PR', '应对 Review', 'Bug Fix', '文档与国际化', '新功能'],
    deliver: '一次被合并的贡献、Contributor 身份、一段能写进简历的说明',
    fit: '想丰富简历、补一段真实开源经历的同学与开发者',
    tint: 'blue',
  },
  {
    id: 'skill',
    no: '03',
    title: '把一本书蒸馏成 AI Skill',
    body: '把一本书、一套方法论或一摊内部经验，压成 Agent 能直接调用的 Skill：能力卡、触发条件、检查清单一应俱全，导入任意 Agent 就能用。',
    does: ['书籍蒸馏', '方法论建卡', 'Skill 打包', '多宿主适配', '教程编写', '流水线自检'],
    deliver: '可导入的 Skill 目录、使用教程、一条自己会报错的校验流水线',
    fit: '想把知识变成随时能调用的能力，而不是又一个收藏夹的人',
    tint: 'yellow',
  },
  {
    id: 'agent',
    no: '04',
    title: 'Agent 工作流与自动化',
    body: '把一件反复做的事变成 Agent 自己能跑完的流程。接你现有的仓库、文档与部署链路，跑完能看见改动，不是只会给建议。',
    does: ['Agent Skill', 'MCP 工具接入', '知识库与 RAG', '定时任务', '网页采集', '接口对接', '批量处理'],
    deliver: '能跑的工作流、部署方式、出错时该看哪里',
    fit: '已经在用 AI，但一直停在「问答」这一步的团队和个人',
    tint: 'blue',
  },
  {
    id: 'front',
    no: '05',
    title: '网站开发与创意前端',
    body: '有视觉主张的页面：品牌站、产品发布页、交互叙事；也接已有站点的功能增加与页面修改。你正在看的这一页就是同一套手艺做的。',
    does: ['整站设计与开发', 'Three.js / WebGL', '滚动编排', '设计系统与令牌', '性能与可访问性', '旧站改版'],
    deliver: '可维护的代码、一套自己能改下去的设计令牌与文档、性能预算达标',
    fit: '已经有内容、但页面撑不起内容的项目',
    tint: 'coral',
  },
  {
    id: 'fix',
    no: '06',
    title: '程序定制与疑难杂症',
    body: 'Python / JavaScript 的小工具定制，已有程序的 Bug 修复、调试与性能优化。往下一层的系统、服务器到电脑本身的毛病也能看 —— 我为这件事专门写过一个 Agent Skill。',
    does: ['脚本与小工具', 'Bug 修复', '性能优化', '数据处理', 'Windows / macOS / Linux', '服务器与部署', '电脑维修'],
    deliver: '能用的东西、源码、以及怎么自己继续改',
    fit: '需求不大没人愿意接，或者已经被别人做砸了的活',
    tint: 'yellow',
  },
]

/** 三步流程。作用是降低第一封信的门槛，写清哪一步不要钱。 */
export const servicesFlow = [
  {
    no: '01',
    title: '说清楚你要解决什么',
    body: '贴仓库地址、截图、报错日志都行，不需要先整理成需求文档。',
  },
  {
    no: '02',
    title: '我回一份可执行的判断',
    body: '能不能做、打算怎么做、大概多久。做不了会直接说做不了。这一步不收费。',
  },
  {
    no: '03',
    title: '确认范围与报价，开工',
    body: '范围写在明面上，交付前你先验，不满意的地方当场改。',
  },
]

/* ---------------------------------------------------------------- 两条主线 */

export type Track = { id: string; title: string; body: string }

export const tracksIntro = {
  headline: '两条主线，一个交点',
  body: '上面那些活都长在这两条线上。左边这条负责让 AI 真的能改到线上，右边这条负责让人愿意看、看得懂、用得下去。',
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

/* ---------------------------------------------------------------- 装备 */

export const stack = {
  headline: '手上有什么',
  body: '不是徽章墙，是这两年交付项目时真正反复用到的那一批。下面十个仓库的技术栈全在里面。',
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

/* ---------------------------------------------------------------- 作品 */

export type ProjectState = 'live' | 'maintained' | 'archived'

export type Project = {
  slug: string
  name: string
  cn: string
  year: string
  /** 品类。不要写成状态 —— state 也会渲在同一行，撞了就重复一个词。 */
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
  body: '十个还在维护的仓库，横着滑。每张卡写清它解决什么、用什么做的、现在什么状态，点卡里的按钮可以直接打开或看源码。star 与 fork 是 GitHub API 当天的真值。',
}

/* 首屏叠卡的门槛：star 少于这个数的不进叠卡。 */
export const DECK_MIN_STARS = 10

export const projects: Project[] = [
  {
    slug: 'video_vip',
    name: 'video_vip',
    cn: '多平台视频解析脚本',
    year: '2023',
    kind: '用户脚本',
    blurb:
      '我 star 最多的仓库，也是维护时间最长的一个。在视频站播放页挂一枚可拖动的按钮，把播放地址交给第三方解析源换回能播的播放器。当前 16 路解析源随时可切，22 条站点适配各写自己的容器与遮罩清理规则。',
    stack: ['JavaScript', '油猴脚本', '多端适配'],
    stars: 4969,
    forks: 493,
    state: 'maintained',
    live: 'https://88lin.github.io/vip/',
    repo: 'https://github.com/88lin/video_vip',
    tint: 'coral',
  },
  {
    slug: 'workbuddy-auto-signin',
    name: 'workbuddy-auto-signin',
    cn: 'WorkBuddy 签到自动化',
    year: '2026',
    kind: '自动化工具',
    blurb:
      '把每日签到、成长任务、盲盒、连登兑换与断登补签全接管掉。零依赖纯 Python，Windows / macOS 定时任务，配置可以直接交给 AI 一句话生成，之后静默跑着不花 token。',
    stack: ['Python', '零依赖', '定时任务', 'MIT'],
    stars: 651,
    forks: 54,
    state: 'maintained',
    repo: 'https://github.com/88lin/workbuddy-auto-signin',
    tint: 'blue',
  },
  {
    slug: 'computer-repair-skill',
    name: 'computer-repair-skill',
    cn: '跨平台电脑维修 Agent',
    year: '2026',
    kind: 'Agent 工程',
    blurb:
      '让 Agent 像一名谨慎的维修工程师：64 个按需加载的 Playbook，覆盖 Windows / macOS / Linux 的诊断、清理、性能、网络与安全维护。先取证，再计划，确认后修改。',
    stack: ['Agent Skill', 'Python', 'Markdown', 'AGPL-3.0'],
    stars: 291,
    forks: 31,
    state: 'live',
    live: 'https://repair.88lin.eu.org',
    repo: 'https://github.com/88lin/computer-repair-skill',
    tint: 'yellow',
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
    stars: 92,
    forks: 23,
    state: 'live',
    live: 'https://lofi.88lin.eu.org',
    repo: 'https://github.com/88lin/lofi-radio-web',
    tint: 'blue',
  },
  {
    slug: 'agentrouter-auto-signin',
    name: 'agentrouter-auto-signin',
    cn: 'AgentRouter 额度自动领取',
    year: '2026',
    kind: '自动化工具',
    blurb:
      '每日签到额度自动领，支持多账号与余额换算，错过了会自动补签。纯 Python 本地静默运行，Windows / macOS / Linux 三套定时任务都给了现成配置。',
    stack: ['Python', '多账号', 'cron', 'MIT'],
    stars: 33,
    forks: 3,
    state: 'maintained',
    repo: 'https://github.com/88lin/agentrouter-auto-signin',
    tint: 'coral',
  },
  {
    slug: 'react-ai-orb',
    name: 'react-ai-orb',
    cn: 'AI 界面的发光球体组件',
    year: '2026',
    kind: '前端组件',
    blurb:
      '给 AI 助手与聊天机器人做的动画球体：纯 CSS 动画、零运行时依赖，内置 8 套调色板与 8 个预设，装上就能用。React 19 与 TypeScript 类型都带着。',
    stack: ['React 19', 'TypeScript', 'CSS 动画', 'MIT'],
    stars: 7,
    forks: 0,
    state: 'live',
    live: 'https://88lin.github.io/react-ai-orb',
    repo: 'https://github.com/88lin/react-ai-orb',
    tint: 'yellow',
  },
  {
    slug: 'facetmark',
    name: 'facetmark',
    cn: '本地书签检索引擎',
    year: '2026',
    kind: '检索工程',
    blurb:
      '给书签建四条索引（字面、内容、意图、上下文），RRF 融合之后逐维实测，赢的留、输的关。负面结果写进 README，不藏。本地单文件 SQLite，1,524 个测试。',
    stack: ['Python', 'SQLite FTS5', 'RRF', 'Local-first'],
    stars: 0,
    forks: 1,
    state: 'live',
    live: 'https://88lin.github.io/facetmark/',
    repo: 'https://github.com/88lin/facetmark',
    tint: 'coral',
  },
  {
    slug: 'textmark',
    name: 'textmark',
    cn: '文字隐形水印',
    year: '2026',
    kind: '浏览器工具',
    blurb:
      '用 Unicode 变体选择符给任意一段文字埋一层看不见的水印，带 Reed-Solomon 纠错与可选的 AES-GCM-256 加密，另配一条 AI 读得懂的 emoji 签名。纯浏览器本地运行，零网络请求，编码规范完全公开。',
    stack: ['JavaScript', 'Unicode', 'Reed-Solomon', '纯前端'],
    stars: 0,
    forks: 0,
    state: 'live',
    live: 'https://88lin.github.io/textmark/',
    repo: 'https://github.com/88lin/textmark',
    tint: 'blue',
  },
  {
    slug: 'geo-book-skill',
    name: 'geo-book-skill',
    cn: '一本书蒸馏成的 Skill',
    year: '2026',
    kind: 'Agent 工程',
    blurb:
      '把《从 SEO 到 GEO》整本书压成 13 张方法论能力卡，讲的是怎么让内容被 AI 搜索引用。适配 Claude Code / Codex / Cursor 等宿主，带教程与全流水线审计 —— 「蒸馏一本书」那项服务的样板。',
    stack: ['Agent Skill', 'GEO', 'Python', 'MIT'],
    stars: 1,
    forks: 0,
    state: 'maintained',
    repo: 'https://github.com/88lin/geo-book-skill',
    tint: 'yellow',
  },
  {
    slug: 'gzh-design-skill',
    name: 'gzh-design-skill',
    cn: '公众号排版技能',
    year: '2026',
    kind: 'Agent 工程',
    blurb:
      '把 Markdown 一键排成能直接粘进公众号编辑器的 HTML。6 套精选主题加一个主题生成器，样式全内联不掉格式，两道脚本关卡校验。',
    stack: ['Agent Skill', 'HTML', 'Python Lint'],
    stars: 0,
    forks: 0,
    state: 'live',
    live: 'https://88lin.github.io/gzh-design-skill/docs/gallery/index.html',
    repo: 'https://github.com/88lin/gzh-design-skill',
    tint: 'coral',
  },
]

/* ---------------------------------------------------------------- 写作 */

export const writing = {
  headline: '写下来的部分',
  body: '博客写的是能直接抄走用的东西：软件资源、AI 工具、效率方法、学习资料。不追热点，追可复用。下面是标签计数，一篇文章可以挂多个标签，所以合计比文章数大。',
  href: 'https://blog.88lin.eu.org',
  hrefLabel: 'blog.88lin.eu.org',
  posts: 56,
  /** 用年份差，不用博客首页那个「建站天数」—— 那个数实测会倒退。 */
  years: 5,
  since: '2021',
  tags: [
    { name: '工具', count: 28 },
    { name: '教程', count: 23 },
    { name: '热门', count: 12 },
    { name: '软件资源', count: 11 },
    { name: 'AI工具', count: 9 },
    { name: '必看', count: 9 },
    { name: '生活', count: 8 },
    { name: '个人成长', count: 6 },
    { name: '思考', count: 6 },
    { name: '健康', count: 6 },
    { name: '省钱攻略', count: 3 },
    { name: '学术论文', count: 3 },
    { name: '学习工具', count: 3 },
  ],
  tagTotal: 27,
  /** 每篇必须带永久链接：只有标题和日期就是六行点不开的死字。 */
  latest: [
    { title: '全网VIP视频免费看教程：短剧电视剧白嫖指南', date: '2026-08-18', href: 'https://blog.88lin.eu.org/article/46' },
    { title: '李笑来作品集：6 本书浓缩成一份可执行的人生操作系统', date: '2026-08-15', href: 'https://blog.88lin.eu.org/article/20' },
    { title: '眼镜是妥协的艺术：挑框、验光、网配蔡司的避坑指南', date: '2026-08-15', href: 'https://blog.88lin.eu.org/article/43' },
    { title: 'C盘清理详细教程：Windows系统一键瘦身', date: '2026-08-15', href: 'https://blog.88lin.eu.org/article/10' },
    { title: '实用生活指南：必备经验与高效技巧分享', date: '2026-08-15', href: 'https://blog.88lin.eu.org/article/50' },
    { title: 'Windows实用教程：常见问题解决与系统优化指南', date: '2026-08-15', href: 'https://blog.88lin.eu.org/article/14' },
  ],
}

/* ---------------------------------------------------------------- 联系 */

export const contact = {
  headline: '有想做的东西？',
  body: '把你要解决的问题说清楚就行 —— 贴仓库地址、截图、报错日志都可以。我会回一份可执行的判断：能不能做、怎么做、大概多久，做不了会直接说。这一步不收费。',
  primary: { label: '邮箱', value: CONTACT_EMAIL, href: CONTACT_HREF },
  /** 微信是二维码不是链接，行为和其它渠道不一样，所以单开一块。 */
  wechat: {
    label: '微信',
    hint: '扫码加我，备注来意',
    src: './wechat-qr.png',
  },
  channels: [
    { id: 'github', label: 'GitHub', value: '@88lin', href: 'https://github.com/88lin' },
    { id: 'qq', label: 'QQ 群', value: '进群聊', href: 'https://qm.qq.com/q/Q46OjlCcY8' },
    { id: 'wechat-mp', label: '公众号', value: '茉灵智库', href: 'https://go.88lin.eu.org/gzh' },
    { id: 'blog', label: '博客', value: 'blog.88lin.eu.org', href: 'https://blog.88lin.eu.org' },
    { id: 'bilibili', label: '哔哩哔哩', value: 'Hathaway', href: 'https://space.bilibili.com/1412014683' },
    { id: 'hub', label: '导航站', value: 'go.88lin.eu.org', href: hub.href },
  ],
}

export const footer = {
  copyright: '© 2023-2026 茉灵智库 · 88lin',
  note: '本站由 Vite + React + GSAP 构建，页面上每个数字都来自公开接口，写了出处，可以自己去核。',
  asOf: AS_OF,
}
