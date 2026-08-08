/**
 * 全站唯一数据源。
 * 所有数值均来自真实来源，核实时间 2026-08-08：
 *  - GitHub REST API /users/88lin 与 /users/88lin/repos（star / fork / 仓库数 / followers）
 *  - blog.88lin.eu.org 首页统计（文章数 / 建站天数 / 分类计数）
 *  - 各仓库 README 与 description（项目文案逐字或据实改写）
 * 刷新方式见 README「数据刷新」一节。
 */

export const META_AS_OF = '2026.08'

export const profile = {
  name: '茉灵智库',
  handle: '88lin',
  role: 'AI 研究者与 Agent 工程实践者',
  latinTagline: 'Following the AI frontier, and turning it into real, shippable engineering.',
  location: '中国 · 浙江',
  since: '2022',
}

export const hero = {
  line1: '把前沿 AI 变成',
  line2Pre: '',
  line2Mark: '看得见',
  line2Post: '的工程。',
  sub: 'AI Agent 工程 × 创意前端。从模型能力到可维护的界面，我负责中间那一段。',
  primaryCta: '聊聊合作',
  secondaryCta: '看作品',
}

export const CTA_LABEL = '聊聊合作'
export const CONTACT_HREF = 'mailto:431761794@qq.com?subject=%E5%90%88%E4%BD%9C%E5%92%A8%E8%AF%A2'

export const nav = [
  { label: '作品', href: '#work' },
  { label: '案例', href: '#cases' },
  { label: '花园', href: '#garden' },
  { label: '写作', href: '#writing' },
]

export type Metric = { value: string; label: string; sub: string }

export const metrics: Metric[] = [
  { value: '4,667', label: '累计 Star', sub: '21 个原创仓库合计' },
  { value: '500', label: 'Fork', sub: '被复用与二次开发' },
  { value: '21', label: '原创开源仓库', sub: '另有 81 个 fork' },
  { value: '55', label: '博客文章', sub: 'blog.88lin.eu.org' },
  { value: '1,781', label: '建站天数', sub: '持续更新中' },
]

/* ---------------------------------------------------------------- 双主线 */

export type Track = { id: string; title: string; body: string }

export const tracksIntro = {
  headline: '两条主线，一个交点',
  body: '我追踪 AI 领域的最新进展，但更在意它们能不能落地：用 AI Agent 工作流把真实项目中的复杂需求，拆解成可交付、可维护、可复盘的工程结果。前沿跑得快，地基更要稳。',
}

export const trackA = {
  kicker: 'AI Agent 工程',
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
  kicker: '创意前端',
  items: [
    {
      id: 'webgl',
      title: 'WebGL 与实时渲染',
      body: 'Three.js 场景、自定义着色器、粒子与折射材质。用一块画布承载整页叙事，而不是堆插件。',
    },
    {
      id: 'system',
      title: '交互与视觉系统',
      body: '令牌化的色彩、字体与间距，滚动编排与状态反馈成体系，改一处不会崩全站。',
    },
    {
      id: 'perf',
      title: '性能与可访问性',
      body: '预算先行：LCP、CLS、包体积、对比度与减弱动效降级，都在构建期用脚本卡住。',
    },
  ] as Track[],
}

/* ---------------------------------------------------------------- 作品 */

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
  live?: string
  repo: string
  cover: string
}

export const projects: Project[] = [
  {
    slug: 'lofi-radio-web',
    name: 'Lofi Radio Web',
    cn: '专注场景的网页电台',
    year: '2026',
    kind: '创意前端',
    blurb:
      'macOS 灵动岛式播放器，21 个精选电台，打开即听，无需注册或下载。支持 PWA 安装、睡眠定时与专注时钟。',
    stack: ['Next.js 16', 'React', 'TypeScript', 'PWA'],
    stars: 87,
    forks: 23,
    live: 'https://lofi.88lin.eu.org',
    repo: 'https://github.com/88lin/lofi-radio-web',
    cover: 'cover-lofi',
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
    live: 'https://repair.88lin.eu.org',
    repo: 'https://github.com/88lin/computer-repair-skill',
    cover: 'cover-repair',
  },
  {
    slug: 'gzh-design-skill',
    name: 'gzh-design-skill',
    cn: '公众号排版技能',
    year: '2026',
    kind: 'Agent 工程',
    blurb:
      '把 Markdown 一键排成可直接粘进公众号编辑器的精致 HTML。8 套主题 + 主题生成器，样式全内联不掉格式，双关卡脚本校验。',
    stack: ['Agent Skill', 'HTML', 'Python Lint'],
    stars: 0,
    forks: 0,
    live: 'https://88lin.github.io/gzh-design-skill/docs/gallery/index.html',
    repo: 'https://github.com/88lin/gzh-design-skill',
    cover: 'cover-gzh',
  },
  {
    slug: 'wesum-wechat-monitor',
    name: 'WeSum',
    cn: '公众号智能摘要推送',
    year: '2026',
    kind: 'AI 管道',
    blurb: '微信公众号内容监控与智能总结摘要推送助手，把订阅源变成每日可读的结构化简报。',
    stack: ['Python', 'LLM', '定时任务'],
    stars: 2,
    forks: 6,
    repo: 'https://github.com/88lin/wesum-wechat-monitor',
    cover: 'cover-wesum',
  },
  {
    slug: 'diataxis-docs-skill',
    name: 'diataxis-docs-skill',
    cn: '技术文档四象限技能',
    year: '2026',
    kind: 'Agent 工程',
    blurb:
      '基于 Diataxis 框架的技术文档写作、分类、拆分与审查技能：让 Agent 判断一篇文档该是教程、指南、参考还是解释。',
    stack: ['Agent Skill', 'Diataxis', 'Python'],
    stars: 1,
    forks: 0,
    repo: 'https://github.com/88lin/diataxis-docs-skill',
    cover: 'cover-diataxis',
  },
  {
    slug: 'video_vip',
    name: 'video_vip',
    cn: '多平台视频解析脚本',
    year: '2023',
    kind: '长期维护',
    blurb:
      '早期项目，也是目前 star 最多的一个。集成多个第三方解析接口并做容错切换，适配 PC 与移动端，长期维护更新。它教会我的是接口会挂、平台会变，而维护成本才是真成本。',
    stack: ['JavaScript', '油猴脚本', '多端适配'],
    stars: 4566,
    forks: 470,
    repo: 'https://github.com/88lin/video_vip',
    cover: 'cover-video',
  },
]

/* ---------------------------------------------------------------- 深度案例 */

export type CaseStudy = {
  slug: string
  index: string
  name: string
  cn: string
  tone: 'cobalt' | 'vermilion' | 'ink'
  sections: { label: string; body: string }[]
  result: { value: string; label: string }[]
  link: string
  linkLabel: string
}

export const cases: CaseStudy[] = [
  {
    slug: 'lofi',
    index: '01',
    name: 'Lofi Radio Web',
    cn: '把「打开即听」做成一个界面约束',
    tone: 'cobalt',
    sections: [
      {
        label: '背景',
        body: '专注场景的背景音需求很稳定，但主流音乐应用都要登录、有推荐流、有社交入口，注意力反而被抢走。目标是做一个打开网页就出声、之后不再打扰你的电台。',
      },
      {
        label: '难点',
        body: '一是播放器必须小到不占视线，又要在切台、缓冲、断流时给出明确反馈；二是 21 路外部音频源的可用性不一致，需要在不打断用户的前提下静默重试与切换；三是要在移动端保持后台可播与安装态体验。',
      },
      {
        label: '方案',
        body: '借鉴 macOS 灵动岛：默认收拢成一枚窄条，只显示当前电台与波形，悬停或点击才展开完整控制。用 PWA 做独立窗口与离线壳，睡眠定时与专注时钟直接长在播放器上，让它成为专注流程的一部分而不是一个额外应用。',
      },
    ],
    result: [
      { value: '87', label: 'GitHub Star' },
      { value: '23', label: 'Fork' },
      { value: '21', label: '精选电台' },
      { value: '0', label: '注册步骤' },
    ],
    link: 'https://lofi.88lin.eu.org',
    linkLabel: '在线体验',
  },
  {
    slug: 'repair',
    index: '02',
    name: 'Computer Repair Skill',
    cn: '给 Agent 装上「先取证，再动手」的职业素养',
    tone: 'vermilion',
    sections: [
      {
        label: '背景',
        body: 'C 盘爆满、系统卡顿、流氓软件、数据恢复，这类问题用自然语言描述很容易，但通用 Agent 常常跳过取证直接给命令，在真机上执行是有破坏性的。',
      },
      {
        label: '难点',
        body: '既要覆盖 Windows / macOS / Linux 三套完全不同的排查路径，又不能把所有知识一次性塞进上下文；同时必须区分只读诊断与写操作，让删除、提权、分区、服务修改这类动作永远先经过人确认。',
      },
      {
        label: '方案',
        body: '把知识拆成 62 个专项 Playbook，通过路由索引按问题按需加载，无关内容不进上下文。执行层设两条硬规则：证据优先，先读系统状态、日志与硬件事实再建立候选原因；只读优先，任何改变状态的操作都要先给出影响面、回滚方案与验证步骤。整套技能是纯 Markdown 与 YAML 资源，不绑定任何桌面程序或专用云端 API，并接入 CI 做结构校验。',
      },
    ],
    result: [
      { value: '62', label: '专项 Playbook' },
      { value: '3', label: '覆盖操作系统' },
      { value: 'CI', label: '结构校验' },
      { value: '0', label: '需装桌面端' },
    ],
    link: 'https://repair.88lin.eu.org',
    linkLabel: '官方网站',
  },
  {
    slug: 'gzh',
    index: '03',
    name: 'gzh-design-skill',
    cn: '在一个到处是限制的编辑器里做设计系统',
    tone: 'ink',
    sections: [
      {
        label: '背景',
        body: '公众号编辑器会过滤 style 标签、class、grid 与 position，粘贴进去经常掉格式。想要稳定的排版质量，只能把设计约束前移到生成阶段。',
      },
      {
        label: '难点',
        body: '样式必须全部内联且只用受支持的写法；同时排版又不能因此变得廉价，要有引言卡、目录、编号章节、代码块、图片与动图角标、脚注式超链接这些真正的组件；最后还要保证 Agent 每次生成的质量可复现。',
      },
      {
        label: '方案',
        body: '把每套主题做成自成体系的组件库：设计变量 + 数十个精细组件 + 视觉层级表 + 文章类型配方表，共 8 套，另配一个可用一句话或一张参考图生成新主题的生成器。质量用双关卡守住，component_lint.py 校验组件库源头，validate_gzh_html.py 校验最终产物，构成可复现的改、验、修闭环。',
      },
    ],
    result: [
      { value: '8', label: '成套主题' },
      { value: '2', label: '道校验关卡' },
      { value: '100%', label: '样式内联' },
      { value: '1', label: '键复制粘贴' },
    ],
    link: 'https://88lin.github.io/gzh-design-skill/docs/gallery/index.html',
    linkLabel: '主题画廊',
  },
]

/* ---------------------------------------------------------------- 数字花园 */

export type GardenItem = { name: string; href: string; group: GardenGroup }
export type GardenGroup = '特效' | '工具' | '内容' | '组件'

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
  body: '这些年顺手做的小页面，特效、工具、Notion 组件与内容站，都还活着。按住拖动可以逛。',
  hub: 'https://88lin.github.io',
}

/* ---------------------------------------------------------------- 能力 */

export const stack = {
  headline: '用什么把它做出来',
  body: '不是徽章墙。下面是我真正拿来交付项目的那一批。',
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

export const writing = {
  headline: '写下来的部分',
  body: '博客写的是能直接抄走用的东西：软件资源、AI 工具、效率方法与学习资料。不追热点，追可复用。',
  href: 'https://blog.88lin.eu.org',
  hrefLabel: 'blog.88lin.eu.org',
  posts: '55',
  days: '1,781',
  categories: [
    { name: '软件资源', count: 11 },
    { name: 'AI 工具', count: 9 },
    { name: '个人成长', count: 4 },
    { name: '省钱攻略', count: 3 },
    { name: '学术论文', count: 3 },
    { name: '学习工具', count: 3 },
    { name: '课程资源', count: 2 },
    { name: '医学科普', count: 2 },
    { name: '电子书资源', count: 2 },
    { name: '其他分类', count: 6 },
  ],
}

/* ---------------------------------------------------------------- 联系 */

export const contact = {
  headline: '有想做的东西？',
  body: '前端交互、WebGL 视觉、Agent 工作流与知识库落地，都可以直接聊。写清楚你想解决的问题就行，我会回一份可执行的判断。',
  channels: [
    { id: 'email', label: '邮箱', value: '431761794@qq.com', href: 'mailto:431761794@qq.com' },
    { id: 'qq', label: 'QQ', value: '2528251483', href: 'https://qm.qq.com/q/Q46OjlCcY8' },
    { id: 'github', label: 'GitHub', value: '@88lin', href: 'https://github.com/88lin' },
    { id: 'blog', label: '博客', value: 'blog.88lin.eu.org', href: 'https://blog.88lin.eu.org' },
    { id: 'bilibili', label: '哔哩哔哩', value: 'Hathaway', href: 'https://space.bilibili.com/1412014683' },
    { id: 'wechat', label: '公众号', value: '茉灵智库', href: 'https://go.88lin.eu.org/gzh' },
  ],
}

export const footer = {
  copyright: '© 2023 - 2026 茉灵智库 · 88lin',
  note: '本站由 Vite + React + Three.js 构建，源码开源。',
  source: 'https://github.com/88lin/website',
}
