import {
  Color,
  DirectionalLight,
  HemisphereLight,
  NoToneMapping,
  Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import { buildAtlas, faceKey, loadFaceFonts, type Face } from './atlas'
import { FOOT, makeTypeMesh } from './Type'
import { getVelocity } from '../lib/motion'

/* ------------------------------------------------------------------ 常量 */

const N = 40
/**
 * 盘旋那一团只用前 14 枚。标题右边那片空场就 490×260，26 枚摊进去每枚只剩 50px，
 * 字面糊成灰点——这一档要的是「几颗能读出字的铅字在转」，不是一团糠。
 */
const CLUSTER_N = 12
/** 联系区深处飘的散字给 18 枚——避让一扣，同一时刻真正在场的只有六七枚。 */
const FALL_N = 18
const FOV = 32
/** 字块跟着滚动速度往后坠的幅度（px）。这是「页面有重量」的实际来源。 */
const WEIGHT = 26

type Tone = 'paper' | 'ink' | 'mark' | 'brand' | 'pop'
const TONES: Tone[] = ['paper', 'ink', 'mark', 'brand', 'pop']

/** 确定式伪随机：同一个下标永远给同一个数，刷新前后一致。 */
const hash = (i: number, salt = 0) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/* ---------------------------------------------------------------- 正文避让

   画布是 z-index 1，正文是 2，字块永远在字的后面——可「在后面」不等于「不碍事」。
   联系区那排邮箱和 QQ 号只有 15px，一枚白铅字从后面漂过去，号码当场读不出来。

   所以每帧拿一次正文盒，字块靠近就自己淡掉，走过去再显回来。不是加遮罩，是让
   铅字给字让路——这一段本来讲的就是「字」。

   只给散落那一档用（联系区）。工具区那团盘旋的字不设避让：白卡片本来就是
   z-index 2 的实底，铅字从它后面过去是干净的遮挡关系，再叠一层半透明反而在
   红场上糊出一片粉色残影。

   曾经把 pad 放到 44、feather 收到 2，边界上直接切到 0，指望半秒的时间常数
   去柔化。结果是：标题、正文、渠道行三块盒子加上 44px 余量，已经盖掉这一屏
   七成面积，任何一帧真正活着的散字只剩两枚。两枚不是雨，是两块没删干净的东西。

   所以改成「压暗」而不是「抹掉」。画布 z-index 1、正文 z-index 2，字块本来就在
   字的后面；深蓝场 #0F1424 上一枚 16% 的纸色铅字折算下来约 #353A44，压在它上面
   的 15px 号码仍有 9:1 以上。看得见的是一层进深，读不坏任何一个字。
   pad 收到 16~20（只挡贴脸的），feather 放到 26~30（过渡自己走完），floor 给
   0.10~0.18（越是主角压得越狠）。 */
type GuardSpec = { sel: string; pad: number; feather: number; floor: number }
type GuardBand = { els: HTMLElement[]; pad: number; feather: number; floor: number }

/* .ct-foot 不在表里：米色页脚是实底，散字的下界本来就取它的上缘（FLOOR_SEL），
   再设一道避让只是重复。 */
const GUARD_SPEC: Record<string, GuardSpec[]> = {
  contact: [
    /* 字盘给 34：散字贴着字盘边上亮着的时候，看着像字盘掉了一枚，不像雨。 */
    { sel: '.ct-slugs', pad: 34, feather: 26, floor: 0.1 },
    { sel: '.ct-title', pad: 20, feather: 26, floor: 0.1 },
    { sel: '.contact-fade', pad: 16, feather: 28, floor: 0.18 },
    /* 通道行是这一屏唯一要被抄走的东西（邮箱、QQ、GitHub）。别处压到 0.10 就够，
       这里给 0.04：一枚铅字有明暗两个面，压到 0.14 时暗面还留着一块可辨的灰，
       正好盖在「GITHUB」的字肩上。 */
    { sel: '.channel-row', pad: 22, feather: 34, floor: 0.04 },
  ],
}

/**
 * 区块里那块「字不许压过去」的下界元素。
 * 联系区取通道行上缘：下界原先给到米色页脚上缘，字确实没掉到页脚上，但整条
 * 联系方式都在下落路径里，靠避让把字压暗不如干脆不让它下来——雨落到屋檐就停，
 * 比落到桌面上再擦干净干净。
 * 工具区是那四张白卡片（按 section 底算，字会被卡片上缘齐刷刷切成半截）。
 */
const FLOOR_SEL: Record<string, string> = { contact: '.channel-row', stack: '.stack-grid' }

/** 散字的字料按亮调发：ink 铅字（深蓝底）落在深蓝场上就是一块脏斑，一枚都不发。 */
const SPILL_TONES: Tone[] = ['paper', 'paper', 'mark', 'paper', 'pop', 'paper']

/** 屏幕坐标 (sx,sy) 到最近一个正文盒的软距离：盒里取 floor，feather 之外取 1。 */
function clearance(bands: GuardBand[], sx: number, sy: number) {
  let k = 1
  for (const b of bands) {
    for (const el of b.els) {
      const r = el.getBoundingClientRect()
      if (!r.width) continue
      const dx = Math.max(r.left - b.pad - sx, 0, sx - (r.right + b.pad))
      const dy = Math.max(r.top - b.pad - sy, 0, sy - (r.bottom + b.pad))
      const d = Math.hypot(dx, dy)
      if (d >= b.feather) continue
      const v = b.floor + (1 - b.floor) * (d / b.feather)
      if (v < k) k = v
    }
  }
  return k
}

/* ------------------------------------------------------------- 颜色取值 */

function palette() {
  const cs = getComputedStyle(document.documentElement)
  const v = (n: string, f: string) => cs.getPropertyValue(n).trim() || f
  const ink = v('--ink', '#1A1A2E')
  const cream = v('--cream', '#FEFCF6')
  const onBrand = v('--on-brand', '#FFFFFF')
  return {
    ink,
    cream,
    tone: {
      paper: { bg: v('--card-bg', '#FFFFFF'), fg: ink },
      ink: { bg: ink, fg: cream },
      mark: { bg: v('--highlight', '#F4D758'), fg: ink },
      brand: { bg: v('--brand-deep', '#1E5BA8'), fg: onBrand },
      pop: { bg: v('--pop-surface', '#D43A50'), fg: onBrand },
    } as Record<Tone, { bg: string; fg: string }>,
  }
}

/* -------------------------------------------------------------- 锚点解析 */

type Cell = { dx: number; dy: number; size: number; rot: number; c: string; tone: Tone }
type Mode = 'forme' | 'cluster' | 'fall'

type Anchor = {
  id: string
  el: HTMLElement
  section: HTMLElement
  mode: Mode
  cells: Cell[]
  /** 散出去那些字用的字料（本区块标题的字）。字盘那几枚循环用会一屏七个「干」。 */
  spill: Cell[]
  guard: GuardBand[]
  /** 见 FLOOR_SEL：字的下界取它的上缘。 */
  tail: HTMLElement | null
  width: number
  ratio: number
}

const toneOf = (el: Element): Tone =>
  TONES.find((t) => el.classList.contains(`type-slug--${t}`)) ?? 'paper'

/**
 * 排版盒坐标（offsetLeft/Top 链），不含任何 transform。
 * 必须避开 getBoundingClientRect：字盘上有 rotate() 微角度，入场时还挂着
 * GSAP 的 translate，用外接框量出来的格位会整体偏掉一个动画位移。
 */
function layoutOffset(el: HTMLElement) {
  let x = 0
  let y = 0
  let n: HTMLElement | null = el
  while (n) {
    x += n.offsetLeft
    y += n.offsetTop
    n = n.offsetParent as HTMLElement | null
  }
  return { x, y }
}

/**
 * 散字的字料：拿本区块大标题的字。
 * 联系区字盘只有「说干就干」四枚，循环着发下去，一屏里同一个「干」会出现七次；
 * 换成标题「有想做的东西」，散字就还是这一段在说的话。
 */
function readSpill(a: Anchor): Cell[] {
  const src = a.section.querySelector('h1,h2')?.textContent ?? ''
  // 破折号 / 连接号写成转义：字面量会被文案扫描器当成正文里的插入语破折号
  const text = Array.from(src.replace(/[\s。，、：；！？?（）()·\u2014\u2013-]/g, ''))
  return text.map((c, i) => ({
    dx: 0,
    dy: 0,
    size: 0,
    rot: 0,
    c,
    tone: SPILL_TONES[i % SPILL_TONES.length],
  }))
}

/** 从 DOM 那盘字里读出格位。DOM 层是唯一事实来源，3D 不再抄一份字表。 */
function readCells(a: Anchor) {
  a.width = a.el.offsetWidth
  if (a.mode === 'fall' && !a.spill.length) a.spill = readSpill(a)
  const slugs = a.el.querySelectorAll<HTMLElement>('.type-slug')

  if (slugs.length) {
    const host = layoutOffset(a.el)
    a.cells = Array.from(slugs).map((s) => {
      const o = layoutOffset(s)
      const deg = parseFloat(getComputedStyle(s).getPropertyValue('--tm-r')) || 0
      return {
        dx: o.x + s.offsetWidth / 2 - host.x,
        dy: o.y + s.offsetHeight / 2 - host.y,
        size: Math.min(s.offsetWidth, s.offsetHeight),
        rot: (deg * Math.PI) / 180,
        c: (s.textContent || '').trim(),
        tone: toneOf(s),
      }
    })
    return
  }

  // 没有 DOM 字盘的锚点（Stack 标题）：拿标题当字料，自己排一团
  const src = a.el.querySelector('h1,h2,h3')?.textContent ?? a.el.textContent ?? ''
  const text = Array.from(src.replace(/[\s。，、：；！？（）()]/g, ''))
  if (!text.length) text.push('字')
  const clusterTones: Tone[] = ['paper', 'paper', 'ink', 'paper', 'mark', 'paper', 'ink', 'paper']
  // 一枚字只发一次。标题「用什么把它做出来」正好八枚，以前先按 N=40 铺满再取前 12 枚，
  // 于是「用」「什」「把」「么」各来两遍——一团十来枚字里出现重字，第一眼就看见了。
  a.cells = text.slice(0, N).map((c, i) => ({
    dx: 0,
    dy: 0,
    size: 0,
    rot: 0,
    c,
    tone: clusterTones[i % clusterTones.length],
  }))
}

/* ------------------------------------------------------------------ 主体 */

type StageHandle = {
  ok: boolean
  running: boolean
  mode: string
  active: string
  calls: number
}

export function mountTypeStage(): () => void {
  const anchorEls = Array.from(
    document.querySelectorAll<HTMLElement>('[data-type-anchor]')
  ).filter((el) => el.closest('section'))
  if (!anchorEls.length) return () => {}

  const modeById: Record<string, Mode> = { hero: 'forme', stack: 'cluster', contact: 'fall' }

  const anchors: Anchor[] = anchorEls.map((el) => {
    const id = el.dataset.typeAnchor || 'x'
    const section = el.closest('section') as HTMLElement
    return {
      id,
      el,
      section,
      mode: modeById[id] ?? 'forme',
      cells: [],
      spill: [],
      // 元素本身不会变，每帧只重读外接框，不再 querySelector
      guard: (GUARD_SPEC[id] ?? []).map((g) => ({
        els: Array.from(section.querySelectorAll<HTMLElement>(g.sel)),
        pad: g.pad,
        feather: g.feather,
        floor: g.floor,
      })),
      tail: FLOOR_SEL[id] ? section.querySelector<HTMLElement>(FLOOR_SEL[id]) : null,
      width: 0,
      ratio: 0,
    }
  })
  anchors.forEach(readCells)

  /* --- 图集：把所有锚点用到的字面画进一张图 --- */
  const pal = palette()
  const faces: Face[] = []
  for (const a of anchors)
    for (const c of [...a.cells, ...a.spill])
      faces.push({ c: c.c, bg: pal.tone[c.tone].bg, fg: pal.tone[c.tone].fg })
  const atlas = buildAtlas(faces)

  /* --- 渲染器 --- */
  const canvas = document.createElement('canvas')
  canvas.id = 'stage'
  canvas.setAttribute('aria-hidden', 'true')

  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = NoToneMapping
  renderer.setClearAlpha(0)

  const scene = new Scene()
  const camera = new PerspectiveCamera(FOV, 1, 10, 6000)

  scene.add(new HemisphereLight(new Color(pal.cream), new Color(pal.ink), 2.1))
  const key = new DirectionalLight(0xffffff, 2.3)
  key.position.set(-320, 620, 900)
  scene.add(key)
  const fill = new DirectionalLight(0xffffff, 0.6)
  fill.position.set(600, -240, 420)
  scene.add(fill)

  const type = makeTypeMesh(atlas, N)
  scene.add(type.mesh)

  /* --- 实例状态 --- */
  const f32 = () => new Float32Array(N)
  // f = 不透明度。字号是常量，"该不见"一律走这一路，不靠缩放
  const cur = { x: f32(), y: f32(), z: f32(), rx: f32(), ry: f32(), rz: f32(), s: f32(), f: f32() }
  const tgt = { x: f32(), y: f32(), z: f32(), rx: f32(), ry: f32(), rz: f32(), s: f32(), f: f32() }
  const seeded = new Uint8Array(N)
  const dummy = new Object3D()
  const col = new Color()
  const inkCol = new Color(pal.ink)

  const sideOf = (tone: Tone) => col.set(pal.tone[tone].bg).lerp(inkCol, tone === 'ink' ? 0.35 : 0.2)

  /** 给每个实例指定字面与铅身色。切换锚点时调用。 */
  function dress(a: Anchor) {
    const anchored = a.cells.length
    for (let i = 0; i < N; i++) {
      // 前 anchored 枚是坐进字盘格位的，用字盘原字；散出去的换标题字料
      const c =
        i < anchored || !a.spill.length
          ? a.cells[i % Math.max(1, anchored)]
          : a.spill[(i - anchored) % a.spill.length]
      if (!c) continue
      const t = atlas.index.get(faceKey({ c: c.c, bg: pal.tone[c.tone].bg, fg: pal.tone[c.tone].fg }))
      type.setTile(i, t ?? 0)
      type.mesh.setColorAt(i, sideOf(c.tone))
    }
    type.aTile.needsUpdate = true
    if (type.mesh.instanceColor) type.mesh.instanceColor.needsUpdate = true
  }

  /* --- 视口与指针 --- */
  let W = window.innerWidth
  let H = window.innerHeight
  let camZ = 1
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 }

  /** z 平面上 1 世界单位在屏幕上占几像素。相机在 +camZ 看向原点，z 越负越小。 */
  const proj = (z: number) => camZ / Math.max(1, camZ - z)

  function resize() {
    W = window.innerWidth
    H = window.innerHeight
    camZ = H / 2 / Math.tan((FOV * Math.PI) / 360)
    camera.aspect = W / H
    camera.position.set(0, 0, camZ)
    camera.updateProjectionMatrix()
    renderer.setSize(W, H, false)
    anchors.forEach(readCells)
    if (active) dress(active)
  }

  const onPointer = (e: PointerEvent) => {
    ptr.tx = (e.clientX / W) * 2 - 1
    ptr.ty = (e.clientY / H) * 2 - 1
  }

  /* --- 目标布局 --- */

  function targetsForme(a: Anchor, sv: number) {
    const r = a.el.getBoundingClientRect()
    const n = a.cells.length
    for (let i = 0; i < N; i++) {
      if (i >= n) {
        tgt.f[i] = 0
        continue
      }
      tgt.f[i] = 1
      const c = a.cells[i]
      const row = Math.floor(i / 4)
      tgt.x[i] = r.left + c.dx - W / 2
      tgt.y[i] = H / 2 - (r.top + c.dy) - sv * WEIGHT * (1 + row * 0.22)
      tgt.z[i] = -16 + (i % 4) * 5
      tgt.s[i] = c.size / FOOT
      tgt.rx[i] = -ptr.y * 0.1 + sv * 0.2
      tgt.ry[i] = ptr.x * 0.13
      tgt.rz[i] = c.rot
    }
  }

  function targetsCluster(a: Anchor, sv: number, t: number) {
    const sec = a.section.getBoundingClientRect()
    const head = a.el.getBoundingClientRect()
    const shell = (a.el.closest('.sec__inner') as HTMLElement | null)?.getBoundingClientRect()
    // 这一团盘旋的活动范围，四条边都得钳死：
    //   右  版心右缘（内收 8px）        左  标题右缘 + 28
    //   上  导航条下沿                  下  白卡片上缘 − 30
    // 竖向以前放到了 H*0.32，一半的字掉到卡片上被切掉。那是干净的遮挡关系没错，
    // 可一条水平线上齐刷刷切开七枚字，人只会读成 bug，不会读成景深。
    const right = (shell?.right ?? sec.right) - 8
    const left = Math.min(head.right + 28, right - 200)
    const yTop = Math.max(sec.top + 26, 92)
    const yBot = (a.tail ? a.tail.getBoundingClientRect().top : sec.bottom) - 30
    const ry = Math.max(70, (yBot - yTop) / 2)
    // 字料只有标题那几枚（不重字），枚数少了就把每一枚放大一档，空场的占位率不变
    const cn = Math.min(CLUSTER_N, a.cells.length)
    const size = Math.min(Math.max(ry * 0.52, 46), 92)
    // 摆位半径往里收半个字块。谁贴到带边就会被 edge 缩成一粒渣，红场上那是脏点不是景深。
    const ryP = Math.max(28, ry - size * 0.6)
    // 横向铺开一点：字料从 12 枚（含重字）减到标题那 8 枚之后，每枚放大了一档，
    // 2.3 倍纵半径已经不够站，中间几枚会咬在一起，「么」被「来」盖掉大半。
    const rxP = Math.max(90, Math.min((right - left) / 2, ry * 2.6) - size * 0.6)
    const rz = ry * 2.2
    const cxs = right - rxP - size * 0.6
    const cys = (yTop + yBot) / 2
    const spin = t * 0.14 - sv * 0.55
    for (let i = 0; i < N; i++) {
      if (i >= cn) {
        tgt.f[i] = 0
        continue
      }
      // 向日葵螺旋（等面积 sqrt + 黄金角）直接铺屏幕位置。以前用的是球面菲波那契，
      // 三维上确实均匀，可投影到二维就成了这儿三枚叠一块、那儿空一大片。
      const ang = i * 2.399963 + spin
      const rad = Math.sqrt((i + 0.5) / cn) * (0.92 + Math.sin(t * 0.3 + i * 1.7) * 0.08)
      // 进深独立于平面位置：投影上撞在一起的两枚，一近一远，读作前后而不是穿模
      const z = Math.cos(i * 1.7 + t * 0.22) * rz * (0.4 + hash(i, 3) * 0.6)
      const p = proj(z)
      // 先定屏幕位置再折算回世界坐标：这一团有 ±280 的进深，直接拿世界坐标
      // 撒点的话透视会把远的一半往画面中心收，圆盘就歪成了椭圆
      const sx = cxs + Math.cos(ang) * rad * rxP
      const sy = cys + Math.sin(ang) * rad * ryP + sv * WEIGHT * 0.7
      // 越过这条带的上下边就收到 0。这一档用缩放而不是淡出：一团静止的字，
      // 缩小读作「更远」，半透明读作「没渲染完」——红场上尤其明显。
      const edge = clamp01(Math.min(sy - yTop, yBot - sy) / 44)
      tgt.x[i] = (sx - W / 2) / p
      tgt.y[i] = (H / 2 - sy) / p
      tgt.z[i] = z
      tgt.s[i] = (size * (0.82 + hash(i, 13) * 0.34) * edge) / FOOT
      tgt.f[i] = 1
      // 摆而不是翻。ry 以前直接吃了黄金角（ang*0.35），转一圈总有几枚正好侧过去，
      // 红场上那就是一根白棍子，读不出是个字。两轴都只在 ±30° 内晃，字面始终朝人。
      tgt.rx[i] = Math.sin(t * 0.26 + i) * 0.3 - ptr.y * 0.12 + sv * 0.24
      tgt.ry[i] = Math.sin(ang) * 0.44 + ptr.x * 0.16
      tgt.rz[i] = (hash(i, 7) - 0.5) * 0.5
    }
  }

  function targetsFall(a: Anchor, sv: number, t: number) {
    const r = a.el.getBoundingClientRect()
    const sec = a.section.getBoundingClientRect()
    const n = a.cells.length
    // 锚定的那几枚：坠进字缝，落定不再动
    for (let i = 0; i < n; i++) {
      const c = a.cells[i]
      tgt.x[i] = r.left + c.dx - W / 2
      tgt.y[i] = H / 2 - (r.top + c.dy) - sv * WEIGHT * 1.1
      tgt.z[i] = -8 + i * 6
      tgt.s[i] = c.size / FOOT
      tgt.f[i] = 1
      tgt.rx[i] = -ptr.y * 0.12 + sv * 0.26
      tgt.ry[i] = ptr.x * 0.15
      tgt.rz[i] = c.rot
    }
    // 其余：深处慢慢往下掉的散字。
    // 下界取页脚上缘而不是 section 底：页脚是米色的，section 把它算在自己里面，
    // 按 section 底算的话字会掉到浅色页脚上去。上下各留 110px 的淡入淡出，
    // 让每一枚都在自己这块深色场里出生、在自己这块场里消失，接缝上看不到半枚。
    const y0 = sec.top
    const y1 = a.tail ? a.tail.getBoundingClientRect().top : sec.bottom
    const top = y0 - 70
    const span = Math.max(240, y1 - y0 + 140)
    // 屏幕上 43~72px。以前给到 −880 那么深，透视缩下来只剩 29px，字面糊成一个灰点；
    // 深色场上「看不清是什么」的东西一律读作噪点，不是氛围。
    const size = Math.min(Math.max(H * 0.066, 46), 78)
    const last = Math.min(N, n + FALL_N)
    for (let i = n; i < N; i++) {
      if (i >= last) {
        tgt.f[i] = 0
        continue
      }
      const j = i - n
      const h1 = hash(i, 11)
      const h2 = hash(i, 23)
      // 横向与相位都做分层抽样（等分 + 抖动），纯 hash 撒 14 个点必定有一处挤成堆
      const u = (j + hash(i, 31)) / FALL_N
      const ph = (j * 0.618034 + h2) % 1
      // 速度按屏幕像素给（26~56 px/s），不跟区块高度绑死
      const sy0 = top + (((t * (26 + h1 * 30)) / span + ph) % 1) * span
      // 落点也按屏幕给：这些字在 z −240~−540，直接用世界坐标撒会被透视
      // 收进画面中间那一半，正好全砸在正文上——之前就是这么砸的
      const sx = sec.left + (0.05 + u * 0.9) * sec.width
      const z = -240 - h1 * 300
      const p = proj(z)
      // 滚动时整片散字往下坠。避让和进出场都按坠过之后的位置算，不然快滚一屏
      // 会看到字先压到号码上、下一帧才想起来躲
      const sy = sy0 + sv * WEIGHT * 1.6 * p
      // 上下界各让出半个字块：贴着边淡出的话，字块有一半已经探进上一段的米色场里了
      const edge = clamp01(Math.min(sy - (y0 + size * 0.55), y1 - size * 0.6 - sy) / 26)
      tgt.x[i] = (sx - W / 2) / p
      tgt.y[i] = (H / 2 - sy) / p
      tgt.z[i] = z
      tgt.s[i] = (size * (0.74 + h2 * 0.46)) / FOOT
      // 越深越淡（0.92→0.42）。h1 同时管进深，两件事共用一个数，远的那几枚
      // 自己就退成背景层——不然十几枚等亮度的白块糊成一堵墙，读不出前后。
      tgt.f[i] = (0.92 - h1 * 0.5) * edge * clearance(a.guard, sx, sy)
      // 摆而不是翻。原来是绕两轴匀速自转，一半的时间字块是侧着的——深色场上
      // 那就是一根灰色的小棍，读不出是个字。改成绕字面小幅摆动，字始终朝人。
      tgt.rx[i] = Math.sin(t * 0.42 + i * 1.3) * 0.44
      tgt.ry[i] = Math.sin(t * 0.31 + i * 2.1) * 0.5
      tgt.rz[i] = (h2 - 0.5) * 1.2 + Math.sin(t * 0.24 + i) * 0.14
    }
  }

  /** 刚切到某个锚点时，把当前状态直接放到入场姿态，不要从上一段飞过来。 */
  function seed(a: Anchor) {
    for (let i = 0; i < N; i++) {
      cur.x[i] = tgt.x[i]
      cur.z[i] = tgt.z[i] + (a.mode === 'cluster' ? -220 : 0)
      cur.y[i] = tgt.y[i] + (a.mode === 'cluster' ? 0 : 300 + (i % 4) * 60)
      cur.rx[i] = tgt.rx[i] + (a.mode === 'cluster' ? 0 : 0.7)
      cur.ry[i] = tgt.ry[i]
      cur.rz[i] = tgt.rz[i] + (hash(i, 5) - 0.5) * 0.9
      cur.s[i] = a.mode === 'cluster' ? tgt.s[i] * 0.4 : tgt.s[i]
      cur.f[i] = 0
      type.setFade(i, 0)
      seeded[i] = 0
    }
  }

  /* --- 可见性 --- */
  let active: Anchor | null = null
  let running = false
  let raf = 0
  let last = performance.now()
  let clock = 0
  let startedAt = 0

  const handle: StageHandle = { ok: true, running: false, mode: '-', active: '-', calls: 0 }
  ;(window as unknown as { __typeStage?: StageHandle }).__typeStage = handle

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const a = anchors.find((x) => x.el === e.target)
        if (a) a.ratio = e.isIntersecting ? Math.max(e.intersectionRatio, 0.001) : 0
      }
      const next = anchors.reduce<Anchor | null>(
        (best, a) => (a.ratio > (best?.ratio ?? 0) ? a : best),
        null
      )
      if (next !== active) {
        active = next
        if (active) {
          readCells(active)
          dress(active)
          layout(active, 0, clock)
          seed(active)
          startedAt = performance.now()
        }
        handle.mode = active?.mode ?? '-'
        handle.active = active?.id ?? '-'
      }
      next ? start() : stop()
    },
    { threshold: [0, 0.01, 0.15, 0.4, 0.75] }
  )
  anchors.forEach((a) => io.observe(a.el))

  function layout(a: Anchor, sv: number, t: number) {
    if (a.mode === 'cluster') targetsCluster(a, sv, t)
    else if (a.mode === 'fall') targetsFall(a, sv, t)
    else targetsForme(a, sv)
  }

  /* --- 帧循环 --- */
  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    clock += dt
    const a = active
    if (!a) return

    // 容器宽度变了说明版式重排过，重新量一次格位
    const w = a.el.offsetWidth
    if (Math.abs(w - a.width) > 0.5) {
      readCells(a)
      dress(a)
    }

    const sv = getVelocity()
    ptr.x += (ptr.tx - ptr.x) * (1 - Math.pow(0.001, dt))
    ptr.y += (ptr.ty - ptr.y) * (1 - Math.pow(0.001, dt))

    layout(a, sv, clock)

    // 帧率无关的指数逼近。位移比旋转慢一点，重量感就是这么来的。
    const kp = 1 - Math.pow(0.0016, dt)
    const kr = 1 - Math.pow(0.0006, dt)
    const ks = 1 - Math.pow(0.0004, dt)
    // 淡入淡出比位移快一档：躲正文这件事要跟得上滚动，慢了就先糊在字上再退开
    const kf = 1 - Math.pow(0.0009, dt)
    const stagger = (now - startedAt) / 1000

    for (let i = 0; i < N; i++) {
      if (!seeded[i]) {
        if (stagger < i * 0.035) {
          dummy.position.set(cur.x[i], cur.y[i], cur.z[i])
          dummy.rotation.set(cur.rx[i], cur.ry[i], cur.rz[i])
          dummy.scale.setScalar(cur.s[i])
          dummy.updateMatrix()
          type.mesh.setMatrixAt(i, dummy.matrix)
          continue
        }
        seeded[i] = 1
      }
      cur.x[i] += (tgt.x[i] - cur.x[i]) * kp
      cur.y[i] += (tgt.y[i] - cur.y[i]) * kp
      cur.z[i] += (tgt.z[i] - cur.z[i]) * kp
      cur.rx[i] += (tgt.rx[i] - cur.rx[i]) * kr
      cur.ry[i] += (tgt.ry[i] - cur.ry[i]) * kr
      cur.rz[i] += (tgt.rz[i] - cur.rz[i]) * kr
      cur.s[i] += (tgt.s[i] - cur.s[i]) * ks
      cur.f[i] += (tgt.f[i] - cur.f[i]) * kf
      type.setFade(i, cur.f[i] < 0.012 ? 0 : cur.f[i])

      dummy.position.set(cur.x[i], cur.y[i], cur.z[i])
      dummy.rotation.set(cur.rx[i], cur.ry[i], cur.rz[i])
      dummy.scale.setScalar(cur.s[i])
      dummy.updateMatrix()
      type.mesh.setMatrixAt(i, dummy.matrix)
    }
    type.mesh.instanceMatrix.needsUpdate = true
    type.aFade.needsUpdate = true

    renderer.render(scene, camera)
    handle.calls = renderer.info.render.calls
    if (!document.documentElement.dataset.type3d) document.documentElement.dataset.type3d = 'on'
  }

  function start() {
    if (running) return
    running = true
    handle.running = true
    handle.mode = active?.mode ?? '-'
    handle.active = active?.id ?? '-'
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }

  function stop() {
    if (!running) return
    running = false
    handle.running = false
    handle.mode = '-'
    handle.active = '-'
    cancelAnimationFrame(raf)
    raf = 0
    renderer.clear()
  }

  const onVisibility = () => (document.hidden ? stop() : active && start())

  resize()
  document.body.appendChild(canvas)
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', onPointer, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  const onLost = (e: Event) => {
    e.preventDefault()
    stop()
    delete document.documentElement.dataset.type3d
  }
  canvas.addEventListener('webglcontextlost', onLost)
  // 字体到位后原地重画字面，否则图集里可能是回退字形
  loadFaceFonts(faces).then(() => {
    atlas.redraw()
    anchors.forEach(readCells)
    if (active) dress(active)
  })

  return () => {
    io.disconnect()
    stop()
    window.removeEventListener('resize', resize)
    window.removeEventListener('pointermove', onPointer)
    document.removeEventListener('visibilitychange', onVisibility)
    canvas.removeEventListener('webglcontextlost', onLost)
    delete document.documentElement.dataset.type3d
    type.dispose()
    atlas.dispose()
    renderer.dispose()
    canvas.remove()
    delete (window as unknown as { __typeStage?: StageHandle }).__typeStage
  }
}
