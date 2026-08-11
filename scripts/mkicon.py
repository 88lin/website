#!/usr/bin/env python3
"""v10 站点图标全套：favicon.svg / favicon.ico / PNG 各尺寸 / site.webmanifest。

跑法：/opt/conda/bin/python scripts/mkicon.py（依赖 PIL）

—— 为什么这次要重做整套，而不是又换一次图形 ——
v1..v9 每一版都换了图形，但用户始终看到旧图标。真因不是图形没变，是**站点从来
没有过 favicon.ico**：`https://88lin.github.io/favicon.ico` 与
`.../website/favicon.ico` 都是 404。浏览器在标签栏、书签、历史记录里会绕过
<link> 直接去要根目录的 /favicon.ico，要不到就长期吃缓存里的旧图。所以这一版的
重点是**补齐 .ico 兜底 + 全尺寸 PNG + ?v=10 破缓存**，图形只是顺带换。

—— 图形 ——
64 单位画布，rx=14 奶油圆角方（与参考站 mydesign-system 的图标同一套几何语言）。
与参考站的区别：参考站是三条平齐竖块（60/30/10 宽），本站做**错位咬合 + 三边出血**：
蓝主块下沉、从底边出血；黄窄条从顶边出血、左缘压进蓝块；红短块从右下角出血。
三块各咬住一条不同的边（左下 / 上 / 右下），谁都不悬在中间。

四条约束，全是为 16px 服务的（选型时渲染了 A/B/C 三稿逐张比对，这是胜出的一稿）：
  1) 只用三块，不用三条。16px 下 4 单位宽的竖条只剩 1px，会被亚像素抹平。
  2) 黄块必须**压在蓝块上**，不能浮在奶油里。黄对奶油只有 1.4:1，孤立摆放在
     浅色标签栏里等于消失；压住蓝块就永远有一条高反差边界撑住形状。
  3) 黄块还必须**咬住顶边**。早一稿让它悬在 y=10..40，16px 下上下都是奶油，
     那条黄就剩三个像素、糊成一团；顶边出血之后它有了一条硬边，形状立住。
  4) 蓝块与红块之间留 6 单位（16px 下 1.5px）奶油通道，否则两块深色在小尺寸
     会糊成一坨。
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public"

CREAM = "#FEFCF6"
BLUE = "#2B7FD8"
YELLOW = "#F4D758"
RED = "#E84A5F"

# 64 单位坐标系下的三块。(x, y, w, h, 颜色)，按绘制顺序 —— 黄压蓝、红压黄。
BLOCKS = [
    (10, 22, 26, 42, BLUE),    # 主块：下沉，底边出血
    (30, 0, 12, 40, YELLOW),   # 窄条：顶边出血，左缘咬进蓝块
    (42, 34, 22, 30, RED),     # 短块：右下角出血
]
RADIUS = 14  # 64 单位下的圆角


def paint(px: int, pad: float = 0.0, rounded: bool = True) -> Image.Image:
    """把 64 单位的构图渲染成 px×px。

    pad 是安全区内缩比例（0.16 = 四周各留 16%），只给 maskable 图标用。
    rounded=False 时不做圆角遮罩，底色铺满整个方形 —— iOS 与 Android 会自己
    套形状遮罩，我们再套一层就会在角上留一圈奶油描边。
    """
    ss = 4  # 超采样倍率
    n = px * ss
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    inner = n * (1 - 2 * pad)
    k = inner / 64.0          # 单位 → 像素
    off = n * pad

    if rounded:
        d.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(RADIUS * (n / 64.0)), fill=CREAM)
    else:
        d.rectangle([0, 0, n - 1, n - 1], fill=CREAM)

    # 出血块要先画到一张同尺寸的图层上，再用底形状的 alpha 做遮罩，
    # 否则超出边界的部分会盖掉圆角。
    layer = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    for x, y, w, h, color in BLOCKS:
        ld.rectangle([off + x * k, off + y * k, off + (x + w) * k - 1, off + (y + h) * k - 1], fill=color)
    img.alpha_composite(Image.composite(layer, Image.new("RGBA", (n, n), (0, 0, 0, 0)),
                                        img.getchannel("A")))

    return img.resize((px, px), Image.LANCZOS)


SVG = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="88lin">
  <title>茉灵智库 · 88lin</title>
  <defs><clipPath id="c"><rect width="64" height="64" rx="{RADIUS}"/></clipPath></defs>
  <g clip-path="url(#c)">
    <rect width="64" height="64" fill="{CREAM}"/>
""" + "".join(
    f'    <rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}"/>\n'
    for x, y, w, h, c in BLOCKS
) + """  </g>
</svg>
"""

MANIFEST = {
    "name": "茉灵智库 · 88lin",
    "short_name": "88lin",
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    "theme_color": CREAM,
    "background_color": CREAM,
    "icons": [
        {"src": "./icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "./icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"},
    ],
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    made: list[tuple[str, int]] = []

    (OUT / "favicon.svg").write_text(SVG, encoding="utf-8")
    made.append(("favicon.svg", (OUT / "favicon.svg").stat().st_size))

    # .ico：交给 PIL 生成 16/32/48 三帧。源图给 96 —— 96÷2=48、96÷3=32、96÷6=16，
    # 三档全是整数倍下采样，不会在小尺寸上糊边。
    ico_src = paint(96)
    ico_src.save(OUT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    made.append(("favicon.ico", (OUT / "favicon.ico").stat().st_size))

    for px, name in [(16, "favicon-16.png"), (32, "favicon-32.png"), (192, "icon-192.png")]:
        paint(px).save(OUT / name, optimize=True)
        made.append((name, (OUT / name).stat().st_size))

    # apple-touch-icon：**不留透明角**。iOS 会自己套圆角遮罩，底下透明的话
    # 主屏上会露出一圈黑边。所以底色铺满方形。
    paint(180, rounded=False).save(OUT / "apple-touch-icon.png", optimize=True)
    made.append(("apple-touch-icon.png", (OUT / "apple-touch-icon.png").stat().st_size))

    # maskable：Android 会把图标裁成圆/水滴/方角等各种形状，只保证中间 80% 的
    # 内切圆不被裁。所以这一档四周内缩 18%，且同样不做圆角。
    paint(512, pad=0.18, rounded=False).save(OUT / "icon-512.png", optimize=True)
    made.append(("icon-512.png", (OUT / "icon-512.png").stat().st_size))

    (OUT / "site.webmanifest").write_text(
        json.dumps(MANIFEST, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    made.append(("site.webmanifest", (OUT / "site.webmanifest").stat().st_size))

    w = max(len(n) for n, _ in made)
    for name, size in made:
        print(f"{name:<{w}}  {size:>7,} B")
    print(f"{'合计':<{w}}  {sum(s for _, s in made):>7,} B")


if __name__ == "__main__":
    main()
