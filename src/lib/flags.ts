/**
 * 子系统开关。任一子系统验收不过可单独关闭上线，不阻塞其余改动。
 * 通过 URL 参数可临时覆盖，便于审计脚本做负向测试：?flags=-3d,-drag,-sv
 */
function overrides(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  const raw = new URLSearchParams(window.location.search).get('flags')
  return new Set(raw ? raw.split(',').map((s) => s.trim()) : [])
}

const off = /* @__PURE__ */ (() => overrides())()

export const ENABLE_3D = !off.has('-3d')
export const ENABLE_DRAG_TRACK = !off.has('-drag')
export const ENABLE_VELOCITY_BUS = !off.has('-sv')
