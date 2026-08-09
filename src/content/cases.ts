/**
 * 三个深度案例。首页 04 通道用 `summary` + `results`，案例子页用全部字段。
 *
 * 写法规矩：每个案例只讲清楚一件事，按「背景 / 卡在哪 / 怎么解」三段走，
 * 结果只放能被第三方核到的数字，并在 `provenance` 里逐条写明出处。
 * 没有客户证言、没有营收、没有奖项——这些我没有，就不写。
 */

import type { Tone } from './site'

export type CaseSection = { label: string; body: string }
export type CaseResult = { value: string; label: string }
export type Provenance = { value: string; from: string }

export type CaseStudy = {
  slug: string
  no: string
  name: string
  cn: string
  /** 一句话论点，首页卡片上最大的那行 */
  claim: string
  tone: Tone
  year: string
  role: string
  stackLine: string
  /** 首页卡片用的短摘要 */
  summary: string
  sections: CaseSection[]
  /** 子页专属：关键取舍，写清楚放弃了什么 */
  tradeoffs: { title: string; body: string }[]
  results: CaseResult[]
  provenance: Provenance[]
  link?: string
  linkLabel?: string
  repo: string
}

export const casesIntro = {
  headline: '怎么做的',
  body: '三个项目，各写清楚一件事：背景、卡在哪、最后怎么解。数字都是仓库里能查到的。',
}

export const cases: CaseStudy[] = [
  {
    slug: 'lofi',
    no: '01',
    name: 'Lofi Radio Web',
    cn: '专注场景的网页电台',
    claim: '把「打开即听」做成一个界面约束',
    tone: 'peach',
    year: '2026',
    role: '独立设计与开发',
    stackLine: 'Next.js 16 · React · TypeScript · PWA',
    summary:
      '主流音乐应用都要登录、有推荐流、有社交入口，专注反而被抢走。我把「不打扰」变成硬约束：播放器默认收拢成一枚窄条，21 路外部音源静默重试与切换，用户全程不需要处理故障。',
    sections: [
      {
        label: '背景',
        body: '专注场景的背景音需求很稳定，但主流音乐应用都要登录、有推荐流、有社交入口，注意力反而被抢走。目标是做一个打开网页就出声、之后不再打扰你的电台。',
      },
      {
        label: '卡在哪',
        body: '一是播放器必须小到不占视线，又要在切台、缓冲、断流时给出明确反馈；二是 21 路外部音频源的可用性并不一致，需要在不打断用户的前提下静默重试与切换；三是要在移动端保持后台可播与安装态体验。这三条互相打架：反馈要清楚就得占地方，静默切换又意味着不能弹提示。',
      },
      {
        label: '怎么解',
        body: '借鉴 macOS 灵动岛：默认收拢成一枚窄条，只显示当前电台与波形，悬停或点击才展开完整控制。状态不靠文字提示，靠波形本身——缓冲时波形压平，切源时波形跳一次，用户在余光里就能读到，不需要把视线移过来。用 PWA 做独立窗口与离线壳，睡眠定时与专注时钟直接长在播放器上，让它成为专注流程的一部分，而不是又一个要管理的应用。',
      },
    ],
    tradeoffs: [
      {
        title: '放弃了曲目搜索',
        body: '电台不是点播。加了搜索就得加历史、加收藏、加账号，一路滑回主流音乐应用。宁可少一个功能，也不引入第一个需要登录的理由。',
      },
      {
        title: '放弃了自定义电台源',
        body: '让用户填 URL 会把「打开即听」变成「先配置」。21 路精选是我自己听过挑的，可用性由我负责，出问题也由我换。',
      },
    ],
    results: [
      { value: '88', label: 'GitHub Star' },
      { value: '23', label: 'Fork' },
      { value: '21', label: '精选电台' },
      { value: '0', label: '注册步骤' },
    ],
    provenance: [
      { value: '88 Star / 23 Fork', from: 'GitHub API：GET /repos/88lin/lofi-radio-web，2026-08-10' },
      { value: '21 精选电台', from: '仓库内电台配置清单条目数' },
      { value: '0 注册步骤', from: 'lofi.88lin.eu.org 无账号体系，打开即播' },
    ],
    link: 'https://lofi.88lin.eu.org',
    linkLabel: '在线体验',
    repo: 'https://github.com/88lin/lofi-radio-web',
  },
  {
    slug: 'repair',
    no: '02',
    name: 'Computer Repair Skill',
    cn: '跨平台电脑维修 Agent',
    claim: '给 Agent 装上「先取证，再动手」的职业素养',
    tone: 'pine',
    year: '2026',
    role: '技能设计与实现',
    stackLine: 'Agent Skill · Python · Markdown · AGPL-3.0',
    summary:
      '通用 Agent 面对「C 盘爆满」这类问题会跳过取证直接给命令，在真机上执行是有破坏性的。我把知识拆成 62 个按需加载的 Playbook，再压上两条硬规则：证据优先、只读优先。',
    sections: [
      {
        label: '背景',
        body: 'C 盘爆满、系统卡顿、流氓软件、数据恢复，这类问题用自然语言描述很容易，但通用 Agent 常常跳过取证直接给命令。在别人的真机上执行，这是有破坏性的。',
      },
      {
        label: '卡在哪',
        body: '既要覆盖 Windows / macOS / Linux 三套完全不同的排查路径，又不能把所有知识一次性塞进上下文——塞进去就会互相干扰，Agent 会在 Windows 的问题上引用 Linux 的命令。同时必须区分只读诊断与写操作，让删除、提权、分区、服务修改这类动作永远先经过人确认。',
      },
      {
        label: '怎么解',
        body: '把知识拆成 62 个专项 Playbook，通过一张路由索引按问题按需加载，无关内容不进上下文。执行层设两条硬规则：证据优先，先读系统状态、日志与硬件事实，再建立候选原因；只读优先，任何改变状态的操作都必须先给出影响面、回滚方案与验证步骤。整套技能是纯 Markdown 与 YAML 资源，不绑定任何桌面程序或专用云端 API，并接入 CI 做结构校验，保证 62 个文件的路由表永远对得上。',
      },
    ],
    tradeoffs: [
      {
        title: '放弃了「一句话修好」的体验',
        body: '确认步骤会让流程变慢。但这是维修，不是补全代码——一次误删的代价远高于多按一次回车。慢是设计出来的。',
      },
      {
        title: '放弃了桌面客户端',
        body: '做成客户端就要处理签名、更新、权限弹窗与三套安装包。纯文本资源可以被任何支持 Agent Skill 的宿主直接读，迁移成本接近零。',
      },
    ],
    results: [
      { value: '62', label: '专项 Playbook' },
      { value: '3', label: '覆盖操作系统' },
      { value: 'CI', label: '结构校验' },
      { value: '0', label: '需装桌面端' },
    ],
    provenance: [
      { value: '62 专项 Playbook', from: '仓库 playbooks 目录文件数与路由索引条目数' },
      { value: '3 覆盖操作系统', from: 'README 声明的 Windows / macOS / Linux 三条排查路径' },
      { value: 'CI 结构校验', from: '仓库 GitHub Actions 工作流：路由表与 Playbook 结构校验' },
      { value: '7 Star / 1 Fork', from: 'GitHub API：GET /repos/88lin/computer-repair-skill，2026-08-10' },
    ],
    link: 'https://repair.88lin.eu.org',
    linkLabel: '官方网站',
    repo: 'https://github.com/88lin/computer-repair-skill',
  },
  {
    slug: 'video-vip',
    no: '03',
    name: 'video_vip',
    cn: '多平台视频解析脚本',
    claim: '接口一定会挂，所以整件事按「可切换」来设计',
    tone: 'berry',
    year: '2023 起持续维护',
    role: '独立开发与长期维护',
    stackLine: 'JavaScript · 油猴脚本 · 22 站点适配',
    summary:
      '2023 年写的脚本，现在 4,581 star。它能活三年不是因为写得多好，是因为一开始就假设「用到的东西都会坏」：18 路解析接口随时可换，22 个站点各自独立适配，任何一处失效都不影响其余。',
    sections: [
      {
        label: '背景',
        body: '2023 年写的一个油猴脚本，解决的是一件很朴素的事：在会员视频页面上，把播放地址交给第三方解析服务，换一个能播的播放器回来。它现在是我 star 最多的仓库，4,581 star、471 fork，也是我维护时间最长的一个。',
      },
      {
        label: '卡在哪',
        body: '这类脚本的真正难点从来不是「怎么解析」，而是它依赖的每一样东西都会坏：第三方解析服务随时下线或被墙，视频站随时改播放器 DOM 结构、改会员遮罩的类名、改域名，油猴宿主与浏览器策略也在变。任何一个硬编码，三个月后就是一条 issue。',
      },
      {
        label: '怎么解',
        body: '把「会坏」当成规格写进结构里。解析服务不是一个常量而是一张 18 项的可切换清单，用户在悬浮面板里一秒换一路，脚本本身不判断谁好谁坏——判断权交给此刻能播的那一路。站点适配不做通用选择器，22 个域名各写一份：自己的播放器容器、自己要显示的节点、自己要清掉的会员遮罩节点，改一个站不牵动其余 21 个。入口用 35 条 @include 同时覆盖 PC 与移动端域名。整个悬浮按钮可以右键拖到任何位置并记住，因为不同站点的播放器控制条位置不一样，固定坐标注定会挡住某个站的按钮。',
      },
    ],
    tradeoffs: [
      {
        title: '放弃了自建解析服务',
        body: '自建能控制质量，但也把单点故障和法律风险都揽到自己身上。用可切换的第三方清单，代价是画质与广告不可控——所以 README 里直说了这一点，并建议配 AdGuard。',
      },
      {
        title: '放弃了自动选择「最快接口」',
        body: '探活需要真的去请求每一路，慢、吵、还容易被限流。让人一秒切换，比让程序猜要可靠——这也是整个项目最核心的判断。',
      },
    ],
    results: [
      { value: '4,581', label: 'GitHub Star' },
      { value: '471', label: 'Fork' },
      { value: '18', label: '路解析接口' },
      { value: '22', label: '个站点适配器' },
    ],
    provenance: [
      { value: '4,581 Star / 471 Fork', from: 'GitHub API：GET /repos/88lin/video_vip，2026-08-10' },
      { value: '18 路解析接口', from: 'video_vip.user.js v3.1.10 解析清单，另有 1 路（默认B）已注释停用' },
      { value: '22 个站点适配器', from: 'video_vip.user.js v3.1.10 站点配置表，逐个域名各一份' },
      { value: '35 条 @include', from: 'video_vip.user.js v3.1.10 脚本头，覆盖 PC 与移动端入口' },
    ],
    link: 'https://88lin.github.io/vip/',
    linkLabel: '网页版',
    repo: 'https://github.com/88lin/video_vip',
  },
]

/** video_vip 那 18 路解析接口的真实名字。封面图版与案例页都用它。 */
export const vipInterfaces = [
  '默认A',
  '七哥解析',
  '冰豆解析',
  '花旗解析',
  'CK解析',
  'Player-JY',
  '虾米解析',
  '789解析',
  '937解析',
  'HLS解析',
  '极速解析',
  '剖元解析',
  '973解析',
  'playm3u8',
  '七七云解析',
  '芒果TV1',
  'M1907',
  'Yparse',
]

/** 22 个站点适配器，按域名字母序，与源码一致。 */
export const vipHosts = [
  'film.sohu.com',
  'm.bilibili.com',
  'm.iqiyi.com',
  'm.mgtv.com',
  'm.v.qq.com',
  'm.youku.com',
  'tv.sohu.com',
  'v.pptv.com',
  'v.qq.com',
  'v.youku.com',
  'video.tudou.com',
  'vip.1905.com',
  'vip.pptv.com',
  'w.mgtv.com',
  'www.1905.com',
  'www.acfun.cn',
  'www.bilibili.com',
  'www.iq.com',
  'www.iqiyi.com',
  'www.le.com',
  'www.mgtv.com',
  'www.wasu.cn',
]

export const caseBySlug = (slug: string) => cases.find((c) => c.slug === slug)
