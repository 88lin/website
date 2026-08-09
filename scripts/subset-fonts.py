#!/usr/bin/env python3
"""按站内实际用字做字体子集，输出 public/fonts/*.woff2。

流程：npm run build → npm run chars（浏览器采字）→ 本脚本（定轴 + 子集 + woff2）。

三条不肯让步的规则：
  1) **定轴**。四个源文件都是可变字体，直接子集会把整条 wght 轴带上，
     Noto Sans SC 光轴数据就几百 KB。每个 @font-face 只要一个字重，
     所以先 instancer 定死，再子集。
  2) **正文两档分开**。400 与 650 是两个文件、两套字符集；SemiBold 只排小标题，
     字数是正文的零头，合并只会让首屏多下载几十 KB。
  3) **CJK 不预加载**。字体全部 font-display: swap，先用系统字顶上。
     预加载 100+ KB 的中日韩字体会直接把 LCP 拖过 2.5 s。
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
CHARS = ROOT / "scripts" / "chars"
OUT = ROOT / "public" / "fonts"
SRC_DS = Path("/workspace/fonts/ds")
SRC_NOTO = Path("/workspace/fonts/noto")

# (源文件, 字重, 字符桶, 输出名, 许可证源文件)
JOBS = [
    (SRC_DS / "NotoSerifSC.ttf", 900, "serif", "NotoSerifSC-Display.woff2", "OFL-NotoSerifSC.txt"),
    (SRC_NOTO / "NotoSansSC.ttf", 400, "sans-regular", "NotoSansSC-Regular.woff2", "OFL-NotoSansSC.txt"),
    (SRC_NOTO / "NotoSansSC.ttf", 650, "sans-semibold", "NotoSansSC-Semibold.woff2", "OFL-NotoSansSC.txt"),
    (SRC_DS / "JetBrainsMono.ttf", 400, "mono", "JetBrainsMono-Regular.woff2", "OFL-JetBrainsMono.txt"),
    (SRC_DS / "JetBrainsMono.ttf", 800, "mono", "JetBrainsMono-Bold.woff2", "OFL-JetBrainsMono.txt"),
    (SRC_DS / "Caveat.ttf", 600, "hand", "Caveat.woff2", "OFL-Caveat.txt"),
]

LICENSE_NAME = {
    "OFL-NotoSerifSC.txt": "LICENSE-NotoSerifSC.txt",
    "OFL-NotoSansSC.txt": "LICENSE-NotoSansSC.txt",
    "OFL-JetBrainsMono.txt": "LICENSE-JetBrainsMono.txt",
    "OFL-Caveat.txt": "LICENSE-Caveat.txt",
}

# 站点被 v4 留下的东西：Fraunces 已经不在 CSS 里了，留着只会白占预算。
STALE = ["Fraunces.woff2", "LICENSE-Fraunces.txt"]


def read_chars(bucket: str) -> str:
    f = CHARS / f"{bucket}.txt"
    if not f.exists():
        sys.exit(f"缺少字符表 {f}，先跑 npm run chars")
    return f.read_text(encoding="utf-8")


def build(src: Path, weight: int, bucket: str, out_name: str) -> tuple[int, int]:
    text = read_chars(bucket)
    font = TTFont(src, lazy=False)
    if "fvar" in font:
        axes = {a.axisTag: a for a in font["fvar"].axes}
        w = axes["wght"]
        clamped = max(w.minValue, min(w.maxValue, weight))
        font = instancer.instantiateVariableFont(font, {"wght": clamped}, inplace=True, updateFontNames=False)

    opts = subset.Options()
    opts.flavor = "woff2"
    opts.desubroutinize = True
    opts.harfbuzz_repacker = True
    opts.drop_tables += ["DSIG", "GSUB", "GPOS", "MATH", "BASE", "JSTF"]
    opts.layout_features = []
    opts.name_IDs = [1, 2, 3, 4, 6]
    opts.name_languages = ["*"]
    opts.notdef_outline = False
    opts.recalc_bounds = True
    opts.glyph_names = False
    opts.hinting = False
    opts.legacy_kern = False

    subsetter = subset.Subsetter(options=opts)
    subsetter.populate(text=text)
    subsetter.subset(font)

    dest = OUT / out_name
    font.flavorData = None
    font.flavor = "woff2"
    font.save(dest)
    font.close()
    return len(set(text)), dest.stat().st_size


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name in STALE:
        p = OUT / name
        if p.exists():
            p.unlink()
            print(f"清理 {name}")

    total = 0
    rows = []
    for src, weight, bucket, out_name, lic in JOBS:
        if not src.exists():
            sys.exit(f"缺少源字体 {src}")
        n, size = build(src, weight, bucket, out_name)
        total += size
        rows.append((out_name, weight, n, size))
        lic_src = SRC_DS / lic
        if lic_src.exists():
            shutil.copyfile(lic_src, OUT / LICENSE_NAME[lic])

    width = max(len(r[0]) for r in rows)
    for out_name, weight, n, size in rows:
        print(f"{out_name:<{width}}  wght {weight:<3}  {n:>5} 字  {size / 1024:7.1f} KB")
    print(f"{'合计':<{width}}                       {total / 1024:7.1f} KB  / 预算 200 KB")
    if total > 200 * 1024:
        sys.exit("字体总量超预算")


if __name__ == "__main__":
    main()
