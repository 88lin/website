/**
 * 满幅光学体。单个全屏片元着色器，零资产 —— 没有 GLB、没有 HDR、没有贴图。
 *
 * 为什么是 raymarching：参考站那种「透光的体积材质」靠的是折射、色散与
 * 次表面辉光，这些是光线在体内走出来的结果，不是贴一张渐变能糊出来的。
 * 用 SDF 直接算，整块画面只有一个 draw call，包体只有几 KB。
 *
 * 形体：五片弯曲的花瓣绕轴排开，smooth-min 融成一体。**没有一条硬边，
 * 没有一个方块** —— 这是上一版体素字雕失败的直接教训。
 *
 * 色散光谱锚在自有品牌三色（蓝 / 珊瑚 / 柠檬）上，不用默认彩虹：
 * 通用彩虹一上来就是「AI 光效」那一档，锚在品牌色上它才是这个站自己的虹彩。
 *
 * 渲染分辨率按 quality 降采样再由 CSS 拉伸：raymarch 是按像素付费的，
 * 1440×900 全分辨率乘 96 步谁都跑不动。0.55 倍在 Retina 上看不出来。
 */

const VERT = `#version 300 es
in vec2 a_p;
void main() { gl_Position = vec4(a_p, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;

uniform vec2 u_res;
uniform float u_t;      /* 秒。极慢漂移用，静止时不推进 */
uniform float u_s;      /* 滚动进度 0..1，驱动相机推进与形体形变 */
uniform vec2 u_ptr;     /* 指针 -1..1，微视差 */
uniform vec3 u_skyLo;   /* 场的低处色 */
uniform vec3 u_skyHi;   /* 场的高处色 */
uniform vec3 u_tintA;   /* 色散锚点：蓝 */
uniform vec3 u_tintB;   /* 色散锚点：珊瑚 */
uniform vec3 u_tintC;   /* 色散锚点：柠檬 */
uniform float u_quality;

out vec4 o_col;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

/* 多项式 smooth-min。k 小 → 保住晶面的棱；k 大 → 融成一坨。 */
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float hash(float n) { return fract(sin(n * 78.233) * 43758.5453); }

/**
 * 一片薄弯面。压扁的椭球，沿 y 弯一道、向尖端收窄。
 *
 * 为什么是薄片而不是晶柱：参考站那种华丽来自**薄**——光在薄玻璃里进出多次，
 * 边缘才会挂上强烈的色散。厚实的晶柱只会把环境糊成一团米色。
 * 表面是圆滑的，不带棱：上一版的教训是硬边一律读成廉价。
 */
float sheet(vec3 p, float len, float wid, float thk, float bend) {
  p.x += bend * p.y * p.y;
  float taper = 1.0 - 0.55 * clamp(p.y / len, 0.0, 1.0);
  vec3 r = vec3(wid * taper, len, thk * taper);
  return (length(p / r) - 1.0) * min(min(r.x, r.y), r.z);
}

/**
 * 满幅扇面。十一片薄弯面从画面外下方一点展开，扫过整幅画面并从四边出血。
 *
 * 这一条是从参考站学到的最重要的构图：图像**不是背景上的一个物体**，
 * 它就是整幅画面。前两次迭代都把一个小物体摆在中间再裁掉顶部，
 * 那是「插图放在栏里」，正是要避开的东西。
 */
float map(vec3 p) {
  p -= vec3(0.58, -0.62, 0.0);
  float grow = 0.55 + 0.45 * u_s;
  float d = 1e9;
  for (int i = 0; i < 11; i++) {
    float fi = float(i);
    vec3 q = p;
    q.xz *= rot(fi * 0.571 + u_t * 0.010 + u_s * 0.45);
    float tilt = 0.10 + 0.95 * hash(fi + 1.0);
    q.yz *= rot(tilt * grow);
    float len = 1.45 + 1.55 * hash(fi + 7.0);
    /* k 只给 0.07：片与片要看得出是分开的层，融成一坨就没有层次了。 */
    d = smin(d, sheet(q, len, 0.30, 0.052, 0.10), 0.07);
  }
  return d;
}

vec3 normalAt(vec3 p) {
  vec2 e = vec2(0.0016, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

/**
 * 程序化环境。没有 HDR 贴图，光全靠这个函数造。
 *
 * 关键教训：透明体折射的是环境。上一版环境是一层均匀的淡渐变，
 * 于是折射出来的也是一片均匀的淡灰 —— 整块东西像一团雾，看不见。
 * 真实玻璃能读出来，是因为环境里有暗的地面、亮的柔光箱、饱和的色区。
 * 这里三样都给：暗地面、顶部一条窄亮带、三块品牌色光区。
 */
vec3 env(vec3 d) {
  vec3 c = mix(u_skyLo * 0.22, u_skyHi, smoothstep(-0.42, 0.72, d.y));

  /* 三块饱和色区，让色散有东西可分离。方向各自错开，转动时颜色会扫过。
     增益给得比直觉高：折射会把颜色摊薄好几倍，环境里不够浓，体上就只剩米灰。 */
  c += u_tintA * pow(max(dot(d, normalize(vec3(-0.75, 0.12, 0.45))), 0.0), 2.6) * 1.30;
  c += u_tintB * pow(max(dot(d, normalize(vec3(0.72, -0.08, 0.52))), 0.0), 2.6) * 0.98;
  c += u_tintC * pow(max(dot(d, normalize(vec3(0.10, 0.38, -0.92))), 0.0), 2.6) * 0.44;

  /* 柔光箱：顶部一条窄亮带 + 侧面一条宽的。晶面上的镜面条纹就是它们的像。
     不能太亮 —— 白光一压过去，上面那三块颜色就全被冲掉了。 */
  float top = smoothstep(0.84, 0.995, d.y);
  float side = smoothstep(0.52, 0.80, abs(d.x)) * smoothstep(-0.15, 0.35, d.y);
  c += vec3(1.0, 0.99, 0.965) * (top * 1.6 + side * 0.55);
  return c;
}

/**
 * 色散光谱响应。
 *
 * f = 0 是长波端、1 是短波端。不用默认彩虹：把长波端锚在珊瑚红、中段锚在
 * 柠檬黄、短波端锚在品牌蓝，于是折射分离出来的颜色始终落在自有三色里 ——
 * 这是「这个站自己的虹彩」和「通用 AI 紫」的分界线。
 */
vec3 spectrum(float f) {
  vec3 c = f < 0.5 ? mix(u_tintB, u_tintC, f * 2.0) : mix(u_tintC, u_tintA, (f - 0.5) * 2.0);
  return c * 1.55 + 0.16;
}

/* 从体内往外走，拿到出射点。折射进去之后 SDF 要取反号。 */
float marchInside(vec3 p, vec3 rd, int steps) {
  float t = 0.02;
  for (int i = 0; i < 24; i++) {
    if (i >= steps) break;
    float d = -map(p + rd * t);
    if (d < 0.0016) break;
    t += max(d, 0.008);
    if (t > 5.0) break;
  }
  return t;
}

/**
 * 色散：一次体内行军，多条波长共用。
 *
 * 逐条波长各走一遍体内行军是正确但买不起的 —— 5 条 × 28 步，加上外部 92 步，
 * 每像素两千多次 SDF 求值，1440×900 下一帧十亿次运算，掉到个位数帧率。
 *
 * 这里只用中间波长march 一次拿到出射点与出射法向，其余波长复用同一个出射面，
 * 只各自重算两次折射方向。视觉上的色散主要来自进出两次折射的角度差，不是
 * 体内路程差，所以这个近似看不出来，代价却降到五分之一。
 */
vec3 dispersion(vec3 pos, vec3 n, vec3 rd, int bands, int steps) {
  vec3 rMid = refract(rd, n, 1.0 / 1.45);
  if (dot(rMid, rMid) < 0.001) return env(reflect(rd, n));

  float t = marchInside(pos - n * 0.005, rMid, steps);
  vec3 exitP = pos - n * 0.005 + rMid * t;
  vec3 n2 = -normalAt(exitP);

  vec3 acc = vec3(0.0);
  vec3 wsum = vec3(0.0);
  for (int i = 0; i < 5; i++) {
    if (i >= bands) break;
    float f = float(i) / float(bands - 1);
    float ior = mix(1.36, 1.54, f);
    vec3 r1 = refract(rd, n, 1.0 / ior);
    if (dot(r1, r1) < 0.001) r1 = reflect(rd, n);
    vec3 r2 = refract(r1, n2, ior);
    if (dot(r2, r2) < 0.001) r2 = reflect(r1, n2);
    vec3 resp = spectrum(f);
    acc += env(r2) * resp;
    wsum += resp;
  }
  return acc / max(wsum, vec3(0.001));
}

/* 电影级 tone map（ACES 近似）。没有这一步，加光后的高光全部糊成纯白 ——
   上一版就是整块白掉的。之后再回 sRGB。 */
vec3 tonemap(vec3 x) {
  x *= 0.72;
  vec3 a = x * (2.51 * x + 0.03);
  vec3 b = x * (2.43 * x + 0.59) + 0.14;
  return clamp(a / b, 0.0, 1.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;

  /* 相机：贴得很近，扇面因此扫满整幅画面并从四边出血。
     随滚动继续推进并抬起；指针只给极小的视差（±0.05 rad）。 */
  float dolly = 2.30 - 0.55 * u_s;
  vec3 ro = vec3(0.0, 0.34 + 0.34 * u_s, dolly);
  float yaw = u_ptr.x * 0.05 + u_s * 0.30;
  float pit = -u_ptr.y * 0.035 - 0.04;
  ro.xz *= rot(yaw);
  vec3 ta = vec3(0.05, 0.58, 0.0);
  vec3 fw = normalize(ta - ro);
  /* 基向量顺序：cross(fw, worldUp) 才是屏幕右。写成 cross(worldUp, fw) 会得到
     −X，整幅画面左右镜像 —— 把物体摆到右上，渲出来却在左上，就是这个原因。 */
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(uv.x * rt + (uv.y + pit) * up + 1.30 * fw);

  bool hiQ = u_quality > 0.5;
  int outSteps = hiQ ? 72 : 48;
  int inSteps = hiQ ? 20 : 12;
  int bands = hiQ ? 5 : 3;

  /* 外部行军 */
  float t = 0.0;
  float hit = -1.0;
  for (int i = 0; i < 72; i++) {
    if (i >= outSteps) break;
    vec3 p = ro + rd * t;
    float d = map(p);
    if (d < 0.0018) { hit = t; break; }
    t += d * 0.9;
    if (t > 11.0) break;
  }

  /* 背景不直接用 env()：env 的地面是暗的，而正文是深墨字，需要一个亮场。
     所以背景取 env 往亮场里拉 —— 体折射的是有结构的棚，页面站的是亮场。
     这一步不物理，但产品渲染都这么干，看着对就是对。 */
  vec3 lightField = mix(u_skyLo, u_skyHi, smoothstep(-0.55, 0.85, uv.y));
  vec3 col = mix(env(rd), lightField, 0.80);
  col += u_tintB * 0.05 * (1.0 - smoothstep(0.0, 1.05, length(uv)));

  if (hit > 0.0) {
    vec3 p = ro + rd * hit;
    vec3 n = normalAt(p);
    float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 4.2);

    /*
      真色散：按波长逐条采样，共用一次体内行军（见 dispersion 的注释）。
      早先把三条路径 dot() 成标量再重映射，等于把折射方向的差异抹掉，
      结果一点颜色都没有。
    */
    vec3 disp = dispersion(p, n, rd, bands, inSteps);

    vec3 refl = env(reflect(rd, n));
    col = mix(disp, refl, fres * 0.62);

    /* 高光：一枚窄的镜面点，给「玻璃」定性。 */
    vec3 h = normalize(normalize(vec3(0.38, 0.74, 0.55)) - rd);
    col += vec3(1.0) * pow(max(dot(n, h), 0.0), 190.0) * 0.9;

    /* 边缘辉光：菲涅尔挑出来的那一圈，用柠檬向珊瑚过渡。 */
    col += mix(u_tintC, u_tintB, 0.5 + 0.5 * n.y) * fres * 0.24;

    /**
     * 薄膜干涉。薄玻璃的边缘会挂一层随视角走的彩虹，这是「虹彩」这个词的
     * 物理来源，也是这一版基调选「高亮虹彩」后必须补上的一笔。
     * 相位取菲涅尔与法向，色相仍然过 spectrum() —— 于是彩虹是品牌三色的彩虹，
     * 不是默认那条会一眼读成「AI 光效」的全光谱。
     */
    float phase = fract(fres * 1.9 + n.y * 0.42 + n.x * 0.18);
    col += spectrum(phase) * fres * 0.30;
  }

  /* 暗角 */
  col *= 1.0 - 0.16 * smoothstep(0.55, 1.5, length(uv));

  /**
   * 可读性雾。左下角往亮场里拉一档。
   *
   * 满幅 3D 的代价是「字压在哪里都可能撞上高对比区域」。参考站靠的是画面
   * 本身恰好在文字区偏淡，那是美术一帧一帧调出来的；我们的形体是程序生成、
   * 还会随滚动变，靠不住。所以留一道我能控的保险：标题所在的左下始终被雾
   * 抬亮，正文对比度不受形体影响。这是工程上对「不可控画面」的正确态度。
   */
  float haze = smoothstep(0.35, -0.95, uv.x * 0.72 + uv.y);
  col = mix(col, lightField * 1.03, haze * 0.66);

  col = tonemap(col);
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));

  /* 胶片颗粒。放在 gamma 之后：颗粒是显示空间的东西，不是场景里的光。
     它是「贵」的关键之一 —— 纯净渐变一眼就是 CSS。 */
  float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + u_t) * 43758.5453);
  col += (g - 0.5) * 0.022;

  o_col = vec4(col, 1.0);
}`

export type OpticScene = {
  /** 滚动进度 0..1 */
  setScroll(v: number): void
  setPointer(x: number, y: number): void
  resize(): void
  render(tSec: number): void
  dispose(): void
}

const hex = (s: string, fb: [number, number, number]): [number, number, number] => {
  const m = s.trim().match(/^#([0-9a-f]{6})$/i)
  if (!m) return fb
  const v = parseInt(m[1], 16)
  // sRGB → 近似线性，好让加光不糊成一片白
  const lin = (c: number) => Math.pow(c / 255, 2.2)
  return [lin((v >> 16) & 255), lin((v >> 8) & 255), lin(v & 255)]
}

export function createOptic(canvas: HTMLCanvasElement, quality: 'high' | 'mid'): OpticScene | null {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' })
  if (!gl) return null

  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[optic]', gl.getShaderInfoLog(s))
      return null
    }
    return s
  }
  const vs = sh(gl.VERTEX_SHADER, VERT)
  const fs = sh(gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null
  const prog = gl.createProgram()!
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[optic]', gl.getProgramInfoLog(prog))
    return null
  }
  gl.deleteShader(vs)
  gl.deleteShader(fs)

  const vao = gl.createVertexArray()!
  gl.bindVertexArray(vao)
  const buf = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'a_p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  gl.bindVertexArray(null)

  const U = {
    res: gl.getUniformLocation(prog, 'u_res'),
    t: gl.getUniformLocation(prog, 'u_t'),
    s: gl.getUniformLocation(prog, 'u_s'),
    ptr: gl.getUniformLocation(prog, 'u_ptr'),
    skyLo: gl.getUniformLocation(prog, 'u_skyLo'),
    skyHi: gl.getUniformLocation(prog, 'u_skyHi'),
    tintA: gl.getUniformLocation(prog, 'u_tintA'),
    tintB: gl.getUniformLocation(prog, 'u_tintB'),
    tintC: gl.getUniformLocation(prog, 'u_tintC'),
    quality: gl.getUniformLocation(prog, 'u_quality'),
  }

  const css = getComputedStyle(canvas)
  const tok = (n: string, fb: [number, number, number]) => hex(css.getPropertyValue(n), fb)
  const skyLo = tok('--optic-lo', [0.86, 0.88, 0.96])
  const skyHi = tok('--optic-hi', [0.98, 0.96, 0.99])
  const tintA = tok('--brand', [0.03, 0.2, 0.68])
  const tintB = tok('--pop', [0.78, 0.05, 0.1])
  const tintC = tok('--highlight', [0.88, 0.67, 0.09])

  /* 0.55 倍渲染再拉伸。raymarch 是按像素付费的，这一档在 Retina 上看不出来，
     但把像素数砍掉七成。mid 档再降。 */
  const scale = quality === 'high' ? 0.55 : 0.4
  let w = 0
  let h = 0
  let scroll = 0
  const ptr = { x: 0, y: 0 }

  const resize = () => {
    const r = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = Math.max(1, Math.round(r.width * dpr * scale))
    h = Math.max(1, Math.round(r.height * dpr * scale))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
  }

  const render = (tSec: number) => {
    if (!w || !h) resize()
    gl.viewport(0, 0, w, h)
    gl.useProgram(prog)
    gl.uniform2f(U.res, w, h)
    gl.uniform1f(U.t, tSec)
    gl.uniform1f(U.s, scroll)
    gl.uniform2f(U.ptr, ptr.x, ptr.y)
    gl.uniform3fv(U.skyLo, skyLo)
    gl.uniform3fv(U.skyHi, skyHi)
    gl.uniform3fv(U.tintA, tintA)
    gl.uniform3fv(U.tintB, tintB)
    gl.uniform3fv(U.tintC, tintC)
    gl.uniform1f(U.quality, quality === 'high' ? 1 : 0)
    gl.bindVertexArray(vao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindVertexArray(null)
  }

  resize()

  return {
    setScroll: (v) => {
      scroll = v
    },
    setPointer: (x, y) => {
      ptr.x = x
      ptr.y = y
    },
    resize,
    render,
    dispose: () => {
      gl.deleteBuffer(buf)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(prog)
    },
  }
}
