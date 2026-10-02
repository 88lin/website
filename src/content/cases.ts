/* 六个深度案例。 */

import type { Tint } from './site'
import { repositoryStars, repositoryForks, repositoryProvenance } from './activity'

export type CaseSection = { label: string; body: string }
/* 一条实测。 */
export type CaseResult = { value: string; label: string }
export type Provenance = { value: string; from: string }

export type CaseStudy = {
  slug: string
  no: string
  name: string
  cn: string
  /** 一句话论点，首页卡片上最大的那行 */
  claim: string
  tint: Tint
  year: string
  role: string
  stackLine: string
  /** 首页案例行与子页可见介绍，保留完整叙述 */
  summary: string
  /**
   * 搜索与分享用短摘要，概括正文事实；与可见介绍分开维护。
   * 不要写入随快照变化的数字（如 Star、Fork、仓库数），避免形成过期副本。
   * 修改项目功能或技术取舍时，须与 summary / sections 一起复核。
   */
  seoDescription: string
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
  headline: '开源项目与工程案例',
  body: '六个项目，各写清楚一件事：背景、卡在哪、最后怎么解。数字都是仓库里能查到的，出处折在每一行下面，想核就点开。',
}

export const cases: CaseStudy[] = [
  {
    slug: 'video-vip',
    no: '01',
    name: 'video_vip',
    cn: '全网 VIP 视频解析脚本',
    claim: '在会员视频页上挂一枚按钮，换一个能播的播放器',
    tint: 'rose',
    year: '2023 起持续维护',
    role: '独立开发与长期维护',
    stackLine: 'JavaScript · 油猴脚本 · v3.2.6',
    summary:
      `2023 年写的用户脚本，现在 ${repositoryStars('video_vip')} star，是我维护时间最长的一个。它做的事很朴素：在视频站的播放页左上角挂一枚可拖动的悬浮按钮，点开选一路解析源，把当前播放地址交给它，换回一个能播的播放器容器，并按站点各自的规则清掉会员遮罩与弹层。`,
    seoDescription: '油猴脚本为视频播放页提供可拖动入口，手动切换第三方解析源，按站点适配播放器与遮罩。案例说明兼容性、用户支持，以及画质和广告不可控的取舍。',
    sections: [
      {
        label: '背景',
        body: '解析接口全部收集自互联网，能返回可播地址。但每个视频站的播放器容器、会员遮罩节点都不一样，手动折腾一次只解决一个站、一次访问。写成油猴脚本是为了把这件重复劳动固化下来：装一次，之后打开支持的页面就有那枚按钮。',
      },
      {
        label: '卡在哪',
        body: '三件事都不在「怎么解析」上。一是每个站的 DOM 都不同，22 条站点适配要分别写清播放器容器选择器与要清掉的遮罩/弹层节点，桌面与移动端还是两套；二是解析接口是别人的服务，随时会下线、变慢或插广告，脚本控制不了画质也控制不了广告；三是使用门槛根本不在脚本里 —— 大量用户卡在装脚本管理器、或者装了没开「允许用户脚本」。',
      },
      {
        label: '怎么解',
        body: '解析源做成一张可切换的清单（当前 16 路），失效就换一路、跟着版本更新，不绑死一家；脚本自己不判断谁快谁好，判断权交给此刻能播的那一路。站点适配不用通用选择器，22 条各写一份自己的 container 与 displayNodes / cleanupNodes，改一个站不牵动其余。入口用 35 条 @include 同时覆盖桌面与移动端域名。按钮可以右键拖到任意位置，因为不同站点的控制条位置不一样，固定坐标注定挡住某个站。另外提供一个不装脚本也能用的网页版。README 里篇幅最长的一节不是实现，是「怎么装、为什么不生效、建议配 AdGuard」—— 一个长期维护的脚本，长期成本主要花在兼容性与用户支持上，这一点写在明面上比藏起来有用。',
      },
    ],
    tradeoffs: [
      {
        title: '放弃了自建解析',
        body: '自建能控制画质，但要碰版权与带宽，也不是我能长期维护的东西。用第三方就必须接受画质与广告不可控 —— README 把这句写在最前面，并建议配 AdGuard，不含糊过去。',
      },
      {
        title: '放弃了「自动挑最快的接口」',
        body: '探活得真去请求每一路，慢、吵、还容易被限流。让人一秒切换比让程序猜可靠，代价是用户偶尔要多点一次。',
      },
    ],
    results: [
      { value: repositoryStars('video_vip'), label: 'GitHub Star' },
      { value: repositoryForks('video_vip'), label: 'Fork' },
      { value: '16', label: '解析源' },
      { value: '22', label: '站点适配' },
    ],
    provenance: [
      repositoryProvenance('video_vip'),
      { value: '16 路解析源', from: 'video_vip.user.js v3.2.6 的 videoParseList 条目数（15 路第三方 ?url= 接口 + 1 路无损云）' },
      { value: '22 条站点适配', from: '同一文件 playerContainers 的 host 条目数，覆盖 13 个独立域名，含桌面与移动端' },
      { value: '35 条 @include', from: '同一文件脚本头，覆盖桌面与移动端入口' },
    ],
    link: 'https://88lin.github.io/vip/',
    linkLabel: '网页版',
    repo: 'https://github.com/88lin/video_vip',
  },
  {
    slug: 'workbuddy',
    no: '02',
    name: 'workbuddy-auto-signin',
    cn: 'WorkBuddy 签到自动化',
    claim: '把每天那几下点击，交给一个不花 token 的本地脚本',
    tint: 'blue',
    year: '2026',
    role: '独立开发与长期维护',
    stackLine: 'Python 标准库 · 零依赖 · 单文件 · MIT',
    summary:
      `腾讯的 AI 工作台 WorkBuddy 每天有一串要手点的入口：签到、领旅行礼物、派 Buddy 出门、领任务、领任务奖、连登兑换、开盲盒。每一下都只要一秒，但它们散在不同页面，漏一天就断签。这个脚本把它们全接管了：纯 Python 标准库、单文件、零依赖，只读你本机已有的登录态，仓库里一个密钥都没有。${repositoryStars('workbuddy-auto-signin')} star。`,
    seoDescription: '用纯 Python 标准库完成 WorkBuddy 签到与奖励领取，读取本机登录态并在执行前检查状态；对比 AI 自动化与系统定时的成本和可靠性。',
    sections: [
      {
        label: '背景',
        body: 'WorkBuddy 的签到与成长中心把奖励拆成了七八个入口，分散在不同页面。单看每一个都不值得抱怨，加起来就是每天两分钟、一个月一小时的机械劳动，而且漏一天连签就断。这类事最该交给机器 —— 前提是交得干净：不上传凭据、不重复领、不靠人记得开机。',
      },
      {
        label: '卡在哪',
        body: '三件事，没有一件在「怎么点那个按钮」上。一是鉴权：官方没有开放接口，签到那条是从桌面端逆向出来的，而登录凭据在用户自己的机器上，三个操作系统的存放位置各不相同；把任何 token 写进仓库都是绝对不行的。二是幂等：定时任务一定会重跑，重复领取要么报错要么白白消耗当日名额，脚本必须先查状态再决定动不动手。三是定时到底挂在谁身上：挂在 AI 自动化上跨平台但每跑一次就烧一次模型调用，挂在系统定时器上零成本却只有 Windows 与 macOS 有现成方案。',
      },
      {
        label: '怎么解',
        body: '鉴权只走一条路：读本机凭据。脚本自动探测 Windows / macOS / Linux 三套凭据文件的位置（Linux 没有桌面端，改读 CodeBuddy CLI 那份），仓库里零密钥，所以它可以公开分享而不牵连任何人的账号。每个动作都先查状态、未完成才执行，重复运行不会多领。定时给两条路并把代价摆在明面上：AI 自动化跨平台，但每次消耗一次模型调用；系统级静默（Windows 任务计划程序 / macOS launchd）零 token、零聊天记录，还能设成「关机错过后下次启动补跑」。整个脚本是纯标准库单文件，任意 Python 3 拿来就跑，不用 pip install —— 这类小工具真正的摩擦从来不是功能，是装不上。',
      },
    ],
    tradeoffs: [
      {
        title: '放弃了云端代跑',
        body: '做成服务端就要收用户的登录凭据，那是我不想碰也不该碰的东西。代价是它只能跑在你自己开机的那台机器上 —— 所以系统级那条路专门配了「错过后下次启动补跑」。',
      },
      {
        title: '放弃了只给一种定时方案',
        body: '两种模式各要一套安装说明与故障排查，文档因此比代码长得多。但 token 成本与可靠性之间怎么选，该由用它的人决定，不该由我替他决定。',
      },
    ],
    results: [
      { value: repositoryStars('workbuddy-auto-signin'), label: 'GitHub Star' },
      { value: repositoryForks('workbuddy-auto-signin'), label: 'Fork' },
      { value: '0', label: '第三方依赖' },
      { value: '3', label: '覆盖操作系统' },
    ],
    provenance: [
      repositoryProvenance('workbuddy-auto-signin'),
      { value: '0 第三方依赖', from: 'README 特性表：「零依赖 —— 纯 Python 标准库，不用 pip install」' },
      { value: '3 覆盖操作系统', from: 'README 前置条件与特性表：自动探测 Windows / macOS / Linux 凭据文件' },
      { value: '双定时模式 · 零 token', from: 'README 模式对比表：模式 B 系统级静默，Token 消耗一栏为「零」' },
    ],
    repo: 'https://github.com/88lin/workbuddy-auto-signin',
  },
  {
    slug: 'repair',
    no: '03',
    name: 'Computer Repair Skill',
    cn: '跨平台电脑维修 Agent',
    claim: '先取证，再判断；先计划，再修改',
    tint: 'cream',
    year: '2026',
    role: '技能设计与实现',
    stackLine: 'Agent Skill · Python · Markdown · AGPL-3.0',
    summary:
      '一个能装进 Codex / Claude Code / OpenClaw 的跨平台电脑维修 Skill。C 盘爆满、卡顿、流氓软件、弹窗广告、网络问题这些直接用自然语言说，Agent 按平台与风险挑一条 Playbook 走。64 个 Playbook 按需加载，覆盖 Windows / macOS / Linux。标题那句是它写在 README 第一行的规矩。',
    seoDescription: '把电脑故障描述交给跨平台维修 Agent，按平台与风险选择 Playbook。案例说明如何先取证、制定计划，再修改系统，并按需加载排查流程。',
    sections: [
      {
        label: '背景',
        body: 'C 盘爆满、系统卡顿、流氓软件、数据恢复，这类问题用自然语言描述很容易，但通用 Agent 常常跳过取证直接给命令。在别人的真机上执行，这是有破坏性的。',
      },
      {
        label: '卡在哪',
        body: '既要覆盖 Windows / macOS / Linux 三套完全不同的排查路径，又不能把所有知识一次性塞进上下文。塞进去就会互相干扰，Agent 会在 Windows 的问题上引用 Linux 的命令。同时必须区分只读诊断与写操作，让删除、提权、分区、服务修改这类动作永远先经过人确认。',
      },
      {
        label: '怎么解',
        body: '把知识拆成 64 个专项 Playbook，通过一张路由索引按问题按需加载，无关内容不进上下文。执行层设两条硬规则：证据优先，先读系统状态、日志与硬件事实，再建立候选原因；只读优先，任何改变状态的操作都必须先给出影响面、回滚方案与验证步骤。技能资源以 Markdown 为主，不绑定桌面程序，装进你已经在用的 Agent 就行；仓库带 CI，每次改动都校验 Skill 结构与 Playbook 索引，保证 64 个文件的路由表永远对得上。',
      },
    ],
    tradeoffs: [
      {
        title: '放弃了「一句话修好」的体验',
        body: '确认步骤会让流程变慢。但这是维修，不是补全代码。一次误删的代价远高于多按一次回车。慢是设计出来的。',
      },
      {
        title: '放弃了桌面客户端',
        body: '做成客户端就要处理签名、更新、权限弹窗与三套安装包。以文本资源为主的 Skill 可以被任何支持 Agent Skill 的宿主直接读，迁移成本接近零。',
      },
    ],
    results: [
      { value: '64', label: '专项 Playbook' },
      { value: repositoryStars('computer-repair-skill'), label: 'GitHub Star' },
      { value: '3', label: '覆盖操作系统' },
      { value: '0', label: '需装桌面端' },
    ],
    provenance: [
      { value: '64 专项 Playbook', from: '仓库树 skills/computer-repair-skill/references/playbook-*.md 计数（不含索引与 authoring）' },
      repositoryProvenance('computer-repair-skill'),
      { value: '3 覆盖操作系统', from: 'README 声明的 Windows / macOS / Linux 三条排查路径' },
      { value: 'CI 结构校验', from: '仓库 GitHub Actions 工作流：路由表与 Playbook 结构校验' },
    ],
    link: 'https://repair.88lin.eu.org',
    linkLabel: '官方网站',
    repo: 'https://github.com/88lin/computer-repair-skill',
  },
  {
    slug: 'lofi',
    no: '04',
    name: 'Lofi Radio Web',
    cn: '专注场景的网页电台',
    claim: '打开网页就出声，不用注册，也不用下载',
    tint: 'sage',
    year: '2026',
    role: '独立设计与开发',
    stackLine: 'Next.js 16 · TypeScript · PWA · MIT',
    summary:
      'Lofi 低保真音乐常被用来做专注时的背景音。这个站把它做成打开即听：21 个精选电台，macOS 灵动岛式播放器可以拖到屏幕任意位置，五个单键快捷键，专注计时只在播放时累计，睡眠定时从 15 分钟到 8 小时。没有账号，没有推荐流。',
    seoDescription: '为专注场景制作无需注册的网页电台，提供可拖动播放器、键盘操作和本地计时。案例介绍外部音源故障回退，以及简洁体验与功能扩展之间的取舍。',
    sections: [
      {
        label: '背景',
        body: '专注时的背景音需求很稳定，但主流音乐应用都要登录、有推荐流、有社交入口，注意力反而被抢走。目标是一个打开就出声、之后不再打扰你的电台页。',
      },
      {
        label: '卡在哪',
        body: '音源全部是外部的 —— B 站的 Lofi Girl 直播流，加上 Lofi Cafe、SomaFM、Code Radio、Swiss Classic 这些公开电台，可用性并不一致，直播流还会换协议。播放器又必须小到不占视线，同时得能被随手挪走、能纯键盘操作、桌面和手机都成立。',
      },
      {
        label: '怎么解',
        body: 'B 站直播源准备 HLS 与 FLV 两套候选并做故障回退，切台一键换源。播放器取 macOS 灵动岛的形态，可自由拖到屏幕任意位置；黑胶唱片的旋转动画兼作「正在播」的状态指示，不用额外文字。Space / ← / → / M / T 五个单键覆盖播放、切台、静音与主题，暗亮主题跟随系统。专注计时只在播放时累计、数据只存本地、每天自动重置 —— 它是个习惯工具，不该变成又一处要登录的地方。',
      },
    ],
    tradeoffs: [
      {
        title: '放弃了账号与收藏',
        body: '一旦有收藏就要有账号，接着是历史、同步、推荐，一路滑回主流音乐应用。宁可少一个功能，也不引入第一个需要登录的理由。',
      },
      {
        title: '放弃了自定义音源',
        body: '让用户填 URL 会把「打开即听」变成「先配置」。21 路是挑过的，可用性由我负责，挂了由我换。',
      },
    ],
    results: [
      { value: repositoryStars('lofi-radio-web'), label: 'GitHub Star' },
      { value: repositoryForks('lofi-radio-web'), label: 'Fork' },
      { value: '21', label: '精选电台' },
      { value: '0', label: '注册步骤' },
    ],
    provenance: [
      repositoryProvenance('lofi-radio-web'),
      { value: '21 精选电台', from: 'README 功能特性表：涵盖 Lofi / Chillhop / Jazz / Classical / Hip-Hop / Ambient' },
      { value: '5 个单键快捷键', from: 'README 快捷键表：Space / ← / → / M / T' },
      { value: '0 注册步骤', from: 'lofi.88lin.eu.org 无账号体系，打开即播' },
    ],
    link: 'https://lofi.88lin.eu.org',
    linkLabel: '在线体验',
    repo: 'https://github.com/88lin/lofi-radio-web',
  },
  {
    slug: 'geo-book',
    no: '05',
    name: 'geo-book-skill',
    cn: '一本书蒸馏成的 Agent Skill',
    claim: '书读完就忘，能力卡能被 Agent 当场调用',
    tint: 'lav',
    year: '2026',
    role: '蒸馏设计与实现',
    stackLine: 'Agent Skill · Python · 多宿主适配 · MIT',
    summary:
      '把《从 SEO 到 GEO》整本书压成 13 张 Agent 能直接执行的能力卡：每张写清什么时候触发、怎么算做完、什么时候该停下来反问。配 19 个随包模板与一条一致性校验流水线，装进 Claude Code / Codex / Cursor 都能用。这是「帮你蒸馏一本书」那项服务的样板。',
    seoDescription: '将《从 SEO 到 GEO》蒸馏为 Agent 可执行的能力卡，明确触发条件、执行步骤和停止边界。案例说明来源标注、按需模板与多种开发工具的安装适配。',
    sections: [
      {
        label: '背景',
        body: '一本方法论的书，读完那一周你什么都记得，三个月后只剩几句金句。真正的问题不是记不住，是想不起来该在什么时候用哪一条。Agent 有机会解决这件事 —— 它随时在场，只要方法论被写成它能判断、能执行的形式。',
      },
      {
        label: '卡在哪',
        body: '把整本书塞进上下文不管用：内容会互相干扰，Agent 会在渠道问题上引用爬虫那一章。摘成要点也不管用：要点没有触发条件，Agent 不知道什么时候该用，更不知道什么时候该停下来反问。还有一层更麻烦的 —— 方法论书里混着一手实测、二手转述和作者主张，蒸馏时若不逐条标来源，Agent 会把三者一起当成事实讲出去。',
      },
      {
        label: '怎么解',
        body: '拆成 13 张能力卡，每张带四样东西：触发场景、执行步骤、输入输出契约、边界与反例。最后一样最关键 —— 它让 Agent 知道什么时候该停下来问你，而不是硬答。每条结论逐条标来源与口径，三源交叉印证：原书的六引擎实测（12 题 × 6 引擎、97 次采样）、GEO Wiki 百科、GeoLook 那份 187,818 条引用的数据集。跨卡的大任务另走一条工作流，先做适用性确认再按依赖顺序推进，每步都给判停点。再配 19 个随包模板按需读取，不占常驻上下文。红线直接写死在卡里：刷好评、编数据、伪装中立洗地会被拒绝并给出合规替代。',
      },
    ],
    tradeoffs: [
      {
        title: '放弃了把整本书讲完',
        body: '书里那些有意思但没法执行的段落全砍了。蒸馏只有一条标准：Agent 能不能照着做。做不到的部分收进一篇九千字的精华长文，想读原理的人去那里。',
      },
      {
        title: '放弃了一套装法通吃',
        body: 'Claude Code、Codex、Cursor、WorkBuddy 各有各的技能目录与规范，所以随包给了五种装法，含一个能整段粘进自定义指令的单文件版。维护成本是五倍，但少一种装法就少一批能用上的人。',
      },
    ],
    results: [
      { value: '13', label: '能力卡' },
      { value: '19', label: '随包模板' },
      { value: '6', label: '实测引擎' },
      { value: '5', label: '种装法' },
    ],
    provenance: [
      { value: '13 张能力卡', from: 'README「13 张能力卡」表，逐行计数' },
      { value: '19 个随包模板', from: 'README 随包模板节：9 个国内口径 JSON-LD + 爬虫与索引文件 + 7 张产出物表格' },
      { value: '6 引擎 / 12 题 / 97 次采样', from: 'README：原书 2026-08-05 对豆包 / DeepSeek / 腾讯元宝 / 通义千问 / 文心一言 / Kimi 的实测' },
      { value: '187,818 条引用', from: 'README 三源交叉印证之一：GeoLook CN-GEO 数据集实算' },
    ],
    repo: 'https://github.com/88lin/geo-book-skill',
  },
  {
    slug: 'facetmark',
    no: '06',
    name: 'facetmark',
    cn: '本地书签检索引擎',
    claim: '四条索引逐维实测，赢的留、输的关',
    tint: 'peach',
    year: '2026',
    role: '独立设计与开发',
    stackLine: 'Python · SQLite FTS5 · RRF · Local-first',
    summary:
      '书签搜索只匹配标题，但你记得的是「为什么存」。我给每条书签建四条索引（字面、内容、意图、上下文），用 RRF 融合，然后逐维跑对照实验：融合组输给了最简配置 5.4 个百分点，于是输掉的维度默认关闭，负面结果写进 README。',
    seoDescription: '为本地书签建立多路索引并用 RRF 融合，通过对照实验选择默认配置。案例公开融合效果下降的结果与取舍，保留只读浏览器书签库和本地存储。',
    sections: [
      {
        label: '背景',
        body: '八个月前存过一个页面。你记得为什么存（「帖子里有人讲 Postgres 索引类型的那个」），也记得大概什么时候存的。唯独不记得标题，而浏览器书签搜索只匹配标题。',
      },
      {
        label: '卡在哪',
        body: '直觉的解法是「索引越多越好」：字面匹配、语义向量、LLM 生成的意图查询、收藏时的上下文，四路召回用 RRF 一融合，听上去就是答案。但每多一路索引，构建成本、存储、查询延迟都在涨，而「多一定比少好」从来没有人真量过。',
      },
      {
        label: '怎么解',
        body: '把每条索引当成一个可证伪的假设：四套索引全部建出来，配 RRF 融合，再写一个 eval 命令对 20 余种配置逐个跑同一组查询集。结果发表在 README 里：融合组输给了最简的内容向量配置 5.4 个百分点，加字面索引再掉 5.4pp。于是出厂默认只开赢的那一路，输掉的保留开关但默认关闭。检索之外的一切刻意从简：单文件 SQLite、本地优先、对浏览器书签库永远只读。',
      },
    ],
    tradeoffs: [
      {
        title: '放弃了「融合一定更强」的卖点',
        body: '多路融合在 demo 里更好看，但实测更差。把负面结果写进 README 会让项目显得「没那么强」，但这就是测量的意义：数字约束项目能宣称什么。',
      },
      {
        title: '放弃了云端同步与账号体系',
        body: '本地单文件意味着换机器要自己搬数据。但书签是隐私数据，「什么都不上传」这条承诺比同步便利性更值钱。',
      },
    ],
    results: [
      { value: '4', label: '索引假设' },
      { value: '1,524', label: '测试用例' },
      { value: '5.4pp', label: '融合组实测负增益' },
      { value: '1', label: 'SQLite 文件' },
    ],
    provenance: [
      { value: '1,524 测试用例', from: 'facetmark README Tests 徽章与 tests/ 目录，2026-09-21' },
      { value: '融合 -5.4pp', from: 'README「What Is Actually Measured」：配置 B 对配置 A 的 W1 查询集实测' },
      { value: '4 条索引 / RRF 融合', from: 'README「How It Works」：lex_tri / lex_seg / content / intent + context' },
      repositoryProvenance('facetmark'),
    ],
    link: 'https://88lin.github.io/facetmark/',
    linkLabel: '项目主页',
    repo: 'https://github.com/88lin/facetmark',
  },
]

export const caseBySlug = (slug: string) => cases.find((c) => c.slug === slug)
