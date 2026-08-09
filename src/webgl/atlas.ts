import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'

/** 一枚字面：字 + 底色 + 字色。底色与字色都从色板变量里取，3D 层不引入新颜色。 */
export type Face = { c: string; bg: string; fg: string }

export type Atlas = {
  texture: CanvasTexture
  /** 图集是 grid×grid 的方阵 */
  grid: number
  /** face 的 key（`${c}|${bg}`）→ 图块下标 */
  index: Map<string, number>
  /** 字体到位后原地重画同一张画布，材质与 UV 都不用换 */
  redraw: () => void
  dispose: () => void
}

const SERIF = '"Fraunces","Noto Serif SC Web","Songti SC","STSong",serif'

/** 把这批字面真正需要的字形先加载好，避免图集画出回退字形。 */
export async function loadFaceFonts(faces: Face[]) {
  if (!document.fonts?.load) return
  const chars = Array.from(new Set(faces.map((f) => f.c))).join('')
  if (!chars) return
  await Promise.all([
    document.fonts.load(`700 100px "Noto Serif SC Web"`, chars).catch(() => []),
    document.fonts.load(`700 100px "Fraunces"`, chars).catch(() => []),
  ])
}

export const faceKey = (f: Face) => `${f.c}|${f.bg}`

/**
 * 把所有会用到的字面画进一张图集。
 *
 * 每块图是「已经上好色的完整字面」而不是白字蒙版——这样字面材质完全由贴图决定，
 * 实例色只管铅字的侧壁与倒角，一个 InstancedMesh 就能同时有五种配色的字块，
 * 而且面色和侧色可以各调各的。
 */
export function buildAtlas(faces: Face[], size = 2048): Atlas {
  const uniq: Face[] = []
  const index = new Map<string, number>()
  for (const f of faces) {
    const k = faceKey(f)
    if (index.has(k)) continue
    index.set(k, uniq.length)
    uniq.push(f)
  }

  const grid = Math.max(2, Math.ceil(Math.sqrt(uniq.length)))
  const tile = Math.floor(size / grid)
  const cv = document.createElement('canvas')
  cv.width = size
  cv.height = size
  const ctx = cv.getContext('2d')!

  const paint = () => {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    uniq.forEach((f, i) => {
      const x = (i % grid) * tile
      const y = Math.floor(i / grid) * tile
      ctx.fillStyle = f.bg
      ctx.fillRect(x, y, tile, tile)

      const latin = /^[\x20-\x7E]$/.test(f.c)
      // 拉丁字母的字面比汉字窄，放大一点才压得住同一枚字块
      ctx.font = `700 ${Math.round(tile * (latin ? 0.7 : 0.62))}px ${SERIF}`
      ctx.fillStyle = f.fg
      // 汉字视觉中线略低于几何中线，往下压一点点
      ctx.fillText(f.c, x + tile / 2, y + tile / 2 + tile * (latin ? 0.01 : 0.03))
    })
  }
  paint()

  const texture = new CanvasTexture(cv)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  texture.generateMipmaps = true
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true

  return {
    texture,
    grid,
    index,
    redraw: () => {
      paint()
      texture.needsUpdate = true
    },
    dispose: () => {
      texture.dispose()
      cv.width = cv.height = 0
    },
  }
}
