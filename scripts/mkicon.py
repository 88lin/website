#!/usr/bin/env python3
"""站点图标全套：favicon.svg / favicon.ico / PNG 各尺寸 / site.webmanifest。

跑法：python scripts/mkicon.py（只依赖 PIL）

—— 图形 ——
奶油圆角方 + 一条竖黄条 + 三条递增的圆头横条（蓝 / 深蓝 / 珊瑚）。

**这枚图形是用户指定的**：直接取自他自己的 repair.88lin.eu.org
（`assets/img/favicon.svg`），几何与配色一字不改，只把底色对齐本站的
地面色 #FDFCF8（原图 #fefcf6，差不到一个色阶，肉眼无别，但能和
index.html 的 theme-color 对上）。

—— 之前两版错在哪（留着，别再犯）——
· 三块抽象色块错位咬合、三边出血。判词「太难看」。
· 柠檬黄底 + 墨色「88」（得意黑）。判词「更加难看了，超级无敌丑」。
· 奶油底 + 珊瑚爪印（从他博客那枚「爪爪雪糕」扁平化而来）。判词「还是不好看」。

三次的共同点不是审美能力，是**我一直在自己造方向**。第三次虽然素材取自他的站，
但「扁平化成爪印」这一步仍然是我的发明。真正该做的是最省事的那件：
**他明确说好看的东西，直接用。** 这一版就是这么来的。

—— 16px ——
左边那条竖黄条在 16px 下约 1.5px 宽，靠它和三条横条的**长度递增**认形状，
不靠细节。三条横条与竖条之间留 6 单位（16px 下 1.5px）的奶油通道，
否则小尺寸下会糊成一坨。

—— 缓存 ——
浏览器在标签栏/书签/历史里会绕过 <link> 直接要根目录的 /favicon.ico，
要不到就一直吃缓存里的旧图。所以：
  · favicon.ico 必须存在
  · 换图标时 index.html 里的 ?v= 必须跟着涨
  · https://88lin.github.io/favicon.ico 不在本仓库控制范围内，
    那一份要在 88lin/88lin.github.io 里自己放
"""

from __future__ import annotations

import json
import struct
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public"

CREAM = "#FDFCF8"
YELLOW = "#F4D758"
BLUE = "#2B7FD8"
BLUE_DEEP = "#1E5BA8"
CORAL = "#E84A5F"

RADIUS = 14 / 64   # 圆角占边长的比例
SS = 8             # 超采样倍率

# 64 单位坐标系下的四条。(x, y, w, h, 圆角, 颜色)，与 repair 站那份逐字一致。
BARS = [
    (11, 15, 6, 34, 3, YELLOW),        # 竖条：贯穿三行
    (23, 15, 16, 9, 4.5, BLUE),        # 横条一
    (23, 27.5, 24, 9, 4.5, BLUE_DEEP), # 横条二
    (23, 40, 30, 9, 4.5, CORAL),       # 横条三：最长，收在珊瑚
]


def paint(px: int, pad: float = 0.0, rounded: bool = True) -> Image.Image:
    """渲染 px×px 的图标。

    pad 是安全区内缩比例（0.18 = 四周各留 18%），只给 maskable 用。
    rounded=False 时底色铺满方形 —— iOS 与 Android 会自己套形状遮罩，
    我们再套一层就会在角上留一圈浅色描边。
    """
    n = px * SS
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(RADIUS * n), fill=CREAM)
    else:
        d.rectangle([0, 0, n - 1, n - 1], fill=CREAM)

    inner = n * (1 - 2 * pad)
    k = inner / 64.0
    off = n * pad
    for x, y, w, h, r, color in BARS:
        d.rounded_rectangle(
            [off + x * k, off + y * k, off + (x + w) * k - 1, off + (y + h) * k - 1],
            radius=r * k,
            fill=color,
        )
    return img.resize((px, px), Image.LANCZOS)


def write_ico(path: Path, frames: list[Image.Image]) -> None:
    """PNG-in-ICO。6 字节 ICONDIR + 每帧 16 字节 ICONDIRENTRY + 各帧数据。

    宽高字段 0 表示 256。Vista 起的 Windows 与所有现代浏览器都认 PNG 帧。
    自己写而不用 PIL 的 save(sizes=[...])，是为了每帧独立可控 ——
    万一哪天 16px 要换一张简化版，改这里就行。
    """
    blobs = []
    for im in frames:
        buf = BytesIO()
        im.save(buf, format="PNG", optimize=True)
        blobs.append(buf.getvalue())

    offset = 6 + 16 * len(frames)
    out = bytearray(struct.pack("<HHH", 0, 1, len(frames)))
    for im, blob in zip(frames, blobs):
        w = 0 if im.width >= 256 else im.width
        h = 0 if im.height >= 256 else im.height
        out += struct.pack("<BBBBHHII", w, h, 0, 0, 1, 32, len(blob), offset)
        offset += len(blob)
    for blob in blobs:
        out += blob
    path.write_bytes(bytes(out))


def build_svg() -> str:
    bars = "\n".join(
        f'  <rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{r:g}" fill="{c}"/>'
        for x, y, w, h, r, c in BARS
    )
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="茉灵智库 88lin">
  <title>茉灵智库 · 88lin</title>
  <!-- 取自 repair.88lin.eu.org 的 assets/img/favicon.svg，几何与配色不改。 -->
  <rect width="64" height="64" rx="{RADIUS * 64:g}" fill="{CREAM}"/>
{bars}
</svg>
"""


MANIFEST = {
    "name": "茉灵智库 · 88lin",
    "short_name": "88lin",
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    # 主题色跟着页面地面色，不是图标色 —— 它染的是移动端地址栏，要和页面接得上。
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

    def note(name: str) -> None:
        made.append((name, (OUT / name).stat().st_size))

    (OUT / "favicon.svg").write_text(build_svg(), encoding="utf-8")
    note("favicon.svg")

    write_ico(OUT / "favicon.ico", [paint(16), paint(32), paint(48)])
    note("favicon.ico")

    for px, name in [(16, "favicon-16.png"), (32, "favicon-32.png"), (192, "icon-192.png")]:
        paint(px).save(OUT / name, optimize=True)
        note(name)

    # apple-touch-icon：**不留透明角**。iOS 会自己套圆角遮罩，底下透明的话
    # 主屏上会露出一圈黑边。所以底色铺满方形。
    paint(180, rounded=False).save(OUT / "apple-touch-icon.png", optimize=True)
    note("apple-touch-icon.png")

    # maskable：Android 会把图标裁成圆 / 水滴 / 方角等各种形状，只保证中间 80%
    # 的内切圆不被裁。所以这一档四周内缩 18%，且同样不做圆角。
    paint(512, pad=0.18, rounded=False).save(OUT / "icon-512.png", optimize=True)
    note("icon-512.png")

    (OUT / "site.webmanifest").write_text(
        json.dumps(MANIFEST, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    note("site.webmanifest")

    # 自检：.ico 三帧齐全；16px 那帧四种颜色都还在（说明没被降采样吃掉）
    with Image.open(OUT / "favicon.ico") as ico:
        sizes = sorted(ico.info["sizes"])
        assert sizes == [(16, 16), (32, 32), (48, 48)], sizes

    px16 = paint(16).convert("RGB")
    def near(p, hexs, tol=60):
        want = tuple(int(hexs[i:i + 2], 16) for i in (1, 3, 5))
        return sum(abs(a - b) for a, b in zip(p, want)) < tol
    for name, hexs in [("黄", YELLOW), ("蓝", BLUE), ("深蓝", BLUE_DEEP), ("珊瑚", CORAL)]:
        hit = sum(1 for p in px16.getdata() if near(p, hexs))
        assert hit >= 2, f"16px 帧里找不到{name}条（只有 {hit} 个像素）"

    w = max(len(n) for n, _ in made)
    for name, size in made:
        print(f"{name:<{w}}  {size:>7,} B")
    print(f"{'合计':<{w}}  {sum(s for _, s in made):>7,} B")
    print(f"\n.ico 三帧 {sizes}；16px 帧四条颜色齐全。")


if __name__ == "__main__":
    main()
