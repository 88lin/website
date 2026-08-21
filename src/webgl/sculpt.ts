/**
 * 字雕渲染器。手写 WebGL2，不引 three.js。
 *
 * 场景说到底是「三万多个轴对齐的正方形面 + 一台正交相机 + 平面着色」，
 * three 的场景图、材质系统、光照与后处理一样都用不上，却要付 ~150 KB gz。
 * 这里 300 行做完，整站 JS 预算留给别处。
 *
 * 三条实现决定：
 *
 *  1) **画面不画体素**。实例是暴露面（见 lib/sculpt.ts），一次
 *     drawArraysInstanced 出全部几何。四个顶点的单位方片按法向在顶点着色器里
 *     现场转向 —— t = cross(up, n)、b = cross(n, t) 满足 t×b = n，
 *     所以绕序对六个方向天然一致，正面剔除直接开。
 *
 *  2) **不打光**。面色按法向查一张固定的六档明度表，凹处再按预计算的遮蔽数
 *     压暗。这是版画式的平涂，不是 PBR —— 它要贴的是纸与油墨，不是塑料。
 *
 *  3) **静止就不画**。渲染由外部按需调用，yaw 没变就不发 draw call。
 *     设计系统禁止永动机动画，这条在渲染层也守住：雕塑停着的时候 GPU 是闲的。
 *
 * 颜色一律从 CSS 语义令牌读，不在这里写任何色值 —— 换 palettes.css 的配色组，
 * 字雕跟着换。
 */

import { buildFaces, CELL, type Faces } from '../lib/sculpt'

const VERT = `#version 300 es
in vec2 a_quad;
in vec3 a_cell;
in vec3 a_norm;
in vec2 a_meta;
uniform mat4 u_mvp;
uniform float u_cell;
out vec2 v_uv;
out vec3 v_norm;
out vec2 v_meta;
out float v_depth;
void main() {
  vec3 n = a_norm;
  vec3 up = abs(n.y) > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
  vec3 t = normalize(cross(up, n));
  vec3 b = cross(n, t);
  vec3 p = a_cell + n * (u_cell * 0.5) + t * (a_quad.x * u_cell) + b * (a_quad.y * u_cell);
  v_uv = a_quad + 0.5;
  v_norm = n;
  v_meta = a_meta;
  gl_Position = u_mvp * vec4(p, 1.0);
  /* 正交投影下 NDC z 与真实深度成线性关系，near/far 又被收紧到实体的前后极值，
     所以这一个数直接就是 0（最前）到 1（最后）的归一深度。 */
  v_depth = gl_Position.z * 0.5 + 0.5;
}`

const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
in vec3 v_norm;
in vec2 v_meta;
in float v_depth;
uniform vec3 u_paper;
uniform vec3 u_ink;
uniform vec3 u_yellow;
uniform vec3 u_coral;
uniform vec3 u_ground;
/* (正读权重, 侧读权重) = (|cos yaw|, |sin yaw|)。见下面 mainColor 的注释。 */
uniform vec2 u_read;
out vec4 o_col;

/* 固定明度表：顶面最亮，正读面次之，侧读面再暗一档，背面与底面最暗。
   六个数是排出来的，不是算出来的 —— 目标是「纸做的实体在斜上方天光下」，
   不是物理正确。跨度拉得比初版大：初版正读面 0.90，白面压在奶油底上几乎
   没有明度差，整块东西看着是漂在纸上的一张贴图。 */
float lit(vec3 n) {
  if (n.y > 0.5) return 1.00;
  if (n.y < -0.5) return 0.30;
  if (n.z > 0.5) return 0.72;
  if (n.z < -0.5) return 0.36;
  if (n.x > 0.5) return 0.52;
  return 0.44;
}

void main() {
  /* 彩色只染两个读面的轮廓砖，而且**跟着当前读向淡入淡出**。
     早先的版本让黄边与红边同时常亮，结果正读那一格里黄边和红侧面搅在一起，
     花得读不出字。现在黄的强度乘 |cos yaw|、红的乘 |sin yaw|：
     正读「交付」时只有黄在，侧读「维护」时只有红在，转动过程里两者交接。
     颜色于是带信息 —— 它标的是「现在这一读是哪一个」。 */
  vec3 tint = u_paper;
  float amt = 0.0;
  if (v_meta.x > 1.5) {
    tint = u_coral;
    amt = 0.58 * u_read.y;
  } else if (v_meta.x > 0.5) {
    tint = u_yellow;
    amt = 0.66 * u_read.x;
  }
  vec3 base = mix(u_paper, tint, amt);

  float b = lit(v_norm);
  float ao = v_meta.y / 4.0;
  /* 明暗用**乘**，不用往墨里混。混墨会把黄面拉成橄榄绿 —— 荧光笔黄一旦
     失了色相，「这一读是交付」这条信息就没了。乘法只降明度，色相不动。 */
  vec3 c = base * (0.38 + 0.62 * b);
  c = mix(c, u_ink, ao * 0.16);

  /* 砖缝。每个面就是一块砖，所以缝不用另画几何，压在面的内边即可。
     宽度取「砖宽的 5.5%」与「一个屏幕像素」的较大者：放大时是比例线，
     缩小时不至于细到闪。 */
  vec2 d = min(v_uv, 1.0 - v_uv);
  float e = min(d.x, d.y);
  float w = max(0.055, fwidth(e) * 1.25);
  float m = smoothstep(0.0, w, e - w * 0.55);
  c = mix(mix(c, u_ink, 0.42), c, m);

  /* 空气透视。实体沿 Z 有 64 格深，从正读方向看，字腔（「交」中间那两块白）
     会被一层层后退的顶面填满，字就读不出来了。让颜色随深度退回纸色，
     最前那一层因此最实，后面的层化进版面 —— 既救了可读性，也让这块东西
     真的有了纵深。指数曲线：前四分之一几乎不衰减，后半段快速化开。 */
  float fade = pow(clamp(v_depth, 0.0, 1.0), 1.35) * 0.72;
  c = mix(c, u_ground, fade);

  o_col = vec4(c, 1.0);
}`

/* ---------------------------------------------------------------- 矩阵 */

type M4 = Float32Array

const mul = (a: M4, b: M4, out: M4) => {
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] =
        a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
    }
  }
  return out
}

/** 绕 Y 轴 yaw、再抬 pitch 的观察矩阵。相机始终看向原点，距离由正交投影吸收。 */
const view = (yaw: number, pitch: number, out: M4) => {
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  // 相机基：s = 屏幕右，u = 屏幕上，f = 视线方向（指向被看的东西）
  const s = [cy, 0, -sy]
  const u = [-sy * sp, cp, -cy * sp]
  const f = [-sy * cp, -sp, -cy * cp]
  out.set([
    s[0], u[0], -f[0], 0,
    s[1], u[1], -f[1], 0,
    s[2], u[2], -f[2], 0,
    0, 0, 0, 1,
  ])
  return out
}

const ortho = (l: number, r: number, b: number, t: number, n: number, f: number, out: M4) => {
  out.set([
    2 / (r - l), 0, 0, 0,
    0, 2 / (t - b), 0, 0,
    0, 0, -2 / (f - n), 0,
    -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1,
  ])
  return out
}

/* ---------------------------------------------------------------- 令牌取色 */

const hex = (s: string): [number, number, number] => {
  const m = s.trim().match(/^#([0-9a-f]{6})$/i)
  if (m) {
    const v = parseInt(m[1], 16)
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
  }
  const rgb = s.match(/(\d+(?:\.\d+)?)/g)
  if (rgb && rgb.length >= 3) return [+rgb[0] / 255, +rgb[1] / 255, +rgb[2] / 255]
  return [0, 0, 0]
}

/* ---------------------------------------------------------------- 场景 */

export type SculptScene = {
  /** 转角，弧度。0 = 正读「交付」，π/2 = 侧读「维护」。 */
  setYaw(v: number): void
  /** 视口或容器尺寸变了调一次。 */
  resize(): void
  /** 画一帧。yaw 没动就不必调。 */
  render(): void
  dispose(): void
  faces: number
}

export function createSculpt(canvas: HTMLCanvasElement, dprCap = 1.75): SculptScene | null {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, powerPreference: 'low-power' })
  if (!gl) return null

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('[sculpt] shader:', gl.getShaderInfoLog(sh))
      return null
    }
    return sh
  }

  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null
  const prog = gl.createProgram()!
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[sculpt] link:', gl.getProgramInfoLog(prog))
    return null
  }
  gl.deleteShader(vs)
  gl.deleteShader(fs)

  const faces: Faces = buildFaces()

  const vao = gl.createVertexArray()!
  gl.bindVertexArray(vao)

  const quad = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5])
  const buf = (data: BufferSource, loc: number, size: number, divisor: number) => {
    const b = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(loc, divisor)
    return b
  }
  const bufs = [
    buf(quad, gl.getAttribLocation(prog, 'a_quad'), 2, 0),
    buf(faces.cell, gl.getAttribLocation(prog, 'a_cell'), 3, 1),
    buf(faces.norm, gl.getAttribLocation(prog, 'a_norm'), 3, 1),
    buf(faces.meta, gl.getAttribLocation(prog, 'a_meta'), 2, 1),
  ]
  gl.bindVertexArray(null)

  const U = {
    mvp: gl.getUniformLocation(prog, 'u_mvp'),
    cell: gl.getUniformLocation(prog, 'u_cell'),
    paper: gl.getUniformLocation(prog, 'u_paper'),
    ink: gl.getUniformLocation(prog, 'u_ink'),
    yellow: gl.getUniformLocation(prog, 'u_yellow'),
    coral: gl.getUniformLocation(prog, 'u_coral'),
    ground: gl.getUniformLocation(prog, 'u_ground'),
    read: gl.getUniformLocation(prog, 'u_read'),
  }

  const css = getComputedStyle(canvas)
  const tok = (name: string, fallback: string) => hex(css.getPropertyValue(name) || fallback)
  const paper = tok('--card-bg', '#FFFFFF')
  const ink = tok('--ink', '#1A1A2E')
  const yellow = tok('--highlight', '#F4D758')
  const coral = tok('--pop', '#E84A5F')
  /* 空气透视要退回的那个色，就是这一章的地面色。字雕因此不是浮在页面上的
     一块贴图，它是从纸里长出来的。 */
  const ground = tok('--ground', '#FEFCF6')

  /**
   * 俯角随转角走：两个可读位置上压到 6.5°，转到 45° 抬到 18°。
   *
   * 这条不是为了好看，是为了可读。实体沿 Z 有 64 格深，俯角一大，字腔里就
   * 塞满了一层层后退的顶面 —— 「交」中间那两块白会被填掉，字读不出来。
   * 读位压平、中途抬起，于是：停下来时它是一行精确的字，一转就露出它是个实体。
   * 这正是「一物两读」想说的事，用镜头说了一遍。
   *
   * 读位为什么不压到 0：那样正面看是一张全平的字，看不出这是实体。6.5° 是
   * 实测下来顶面厚度看得见、而字腔还没被后退的顶面填糊的那一档。
   */
  const pitchAt = (y: number) => ((6.5 + 11.5 * Math.abs(Math.sin(2 * y))) * Math.PI) / 180

  const mView = new Float32Array(16)
  const mProj = new Float32Array(16)
  const mMvp = new Float32Array(16)

  let yaw = 0
  let w = 0
  let h = 0

  const corners: number[][] = []
  {
    const hx = faces.size.w / 2
    const hy = faces.size.h / 2
    const hz = faces.size.d / 2
    for (const sx of [-hx, hx]) for (const sy of [-hy, hy]) for (const sz of [-hz, hz]) corners.push([sx, sy, sz])
  }

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap)
    const r = canvas.getBoundingClientRect()
    w = Math.max(1, Math.round(r.width * dpr))
    h = Math.max(1, Math.round(r.height * dpr))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
  }

  const render = () => {
    if (!w || !h) resize()
    view(yaw, pitchAt(yaw), mView)

    /* 相机拟合：把实体八个角投到视空间量外接框，正交范围按当下转角现算。
       固定成 45° 的最坏情况会让两个可读位置上的字只占七成宽 —— 首屏那句话
       就是要占满。转动过程中「先缩再张」是这条拟合的副产物，看着像把一件
       实物转过来给你看，留着。 */
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    for (const c of corners) {
      const x = mView[0] * c[0] + mView[4] * c[1] + mView[8] * c[2]
      const y = mView[1] * c[0] + mView[5] * c[1] + mView[9] * c[2]
      const z = mView[2] * c[0] + mView[6] * c[1] + mView[10] * c[2]
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (z < minZ) minZ = z
      if (z > maxZ) maxZ = z
    }
    const pad = 1.06
    const cw = (maxX - minX) * pad
    const ch = (maxY - minY) * pad
    const aspect = w / h
    let halfW = cw / 2
    let halfH = ch / 2
    if (halfW / halfH < aspect) halfW = halfH * aspect
    else halfH = halfW / aspect
    const midX = (minX + maxX) / 2
    const midY = (minY + maxY) / 2
    /* near / far 收紧到实体的前后极值（各留 1% 余量）：着色器里的 v_depth
       就是归一深度，空气透视直接用它，不必再传一对 z 范围。 */
    const eps = (maxZ - minZ) * 0.01 + 1e-4
    ortho(midX - halfW, midX + halfW, midY - halfH, midY + halfH, -maxZ - eps, -minZ + eps, mProj)
    mul(mProj, mView, mMvp)

    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)

    gl.useProgram(prog)
    gl.uniformMatrix4fv(U.mvp, false, mMvp)
    gl.uniform1f(U.cell, CELL)
    gl.uniform3fv(U.paper, paper)
    gl.uniform3fv(U.ink, ink)
    gl.uniform3fv(U.yellow, yellow)
    gl.uniform3fv(U.coral, coral)
    gl.uniform3fv(U.ground, ground)
    gl.uniform2f(U.read, Math.abs(Math.cos(yaw)), Math.abs(Math.sin(yaw)))
    gl.bindVertexArray(vao)
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, faces.count)
    gl.bindVertexArray(null)
  }

  resize()

  return {
    setYaw: (v) => {
      yaw = v
    },
    resize,
    render,
    faces: faces.count,
    dispose: () => {
      bufs.forEach((b) => gl.deleteBuffer(b))
      gl.deleteVertexArray(vao)
      gl.deleteProgram(prog)
    },
  }
}
