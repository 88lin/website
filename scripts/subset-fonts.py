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

# (源文件, 字重, 字符桶, 输出名, 许可证源文件, 额外定轴)
# 额外定轴只对多轴可变字体有意义：Fraunces 除 wght 外还有 opsz/SOFT/WONK，
# 只 pin wght 会把剩下三条轴的 gvar 数据整块留下，白多几十 KB。
JOBS = [
    (SRC_DS / "NotoSerifSC.ttf", 900, "serif", "NotoSerifSC-Display.woff2", "OFL-NotoSerifSC.txt", {}),
    (SRC_NOTO / "NotoSansSC.ttf", 400, "sans-regular", "NotoSansSC-Regular.woff2", "OFL-NotoSansSC.txt", {}),
    (SRC_NOTO / "NotoSansSC.ttf", 650, "sans-semibold", "NotoSansSC-Semibold.woff2", "OFL-NotoSansSC.txt", {}),
    # 读数与案例编号都是巨号字，opsz 拉到 144 才是这套字的显示形态
    (SRC_DS / "Fraunces.ttf", 900, "num", "Fraunces-Numerals.woff2", "OFL-Fraunces.txt", {"opsz": 144, "SOFT": 0, "WONK": 1}),
    (SRC_DS / "JetBrainsMono.ttf", 400, "mono", "JetBrainsMono-Regular.woff2", "OFL-JetBrainsMono.txt", {}),
    (SRC_DS / "Caveat.ttf", 600, "hand", "Caveat.woff2", "OFL-Caveat.txt", {}),
    (SRC_DS / "ZhiMangXing.ttf", 400, "hand+cjk", "ZhiMangXing.woff2", "OFL-ZhiMangXing.txt", {}),
]

LICENSE_NAME = {
    "OFL-NotoSerifSC.txt": "LICENSE-NotoSerifSC.txt",
    "OFL-NotoSansSC.txt": "LICENSE-NotoSansSC.txt",
    "OFL-Fraunces.txt": "LICENSE-Fraunces.txt",
    "OFL-JetBrainsMono.txt": "LICENSE-JetBrainsMono.txt",
    "OFL-Caveat.txt": "LICENSE-Caveat.txt",
    "OFL-ZhiMangXing.txt": "LICENSE-ZhiMangXing.txt",
}

# v4/v5 留下的旧产物：文件名换了或字重不再被 @font-face 引用，留着只会白占预算。
STALE = ["Fraunces.woff2", "JetBrainsMono-Bold.woff2"]


def read_chars(bucket: str) -> str:
    """桶名后加 +cjk 表示只取表里的中日韩部分。

    手写层是两个文件拼出来的：Caveat 管拉丁与数字，志莽行书管汉字。
    两边共用一张字符表，但各自只子集自己那一半，否则志莽行书会把
    它那套拉丁字形也带进来——那些字形永远轮不到渲染。
    """
    cjk = bucket.endswith("+cjk")
    name = bucket[:-4] if cjk else bucket
    f = CHARS / f"{name}.txt"
    if not f.exists():
        sys.exit(f"缺少字符表 {f}，先跑 npm run chars")
    text = f.read_text(encoding="utf-8")
    if cjk:
        text = "".join(ch for ch in text if ord(ch) >= 0x2E80)
    return text


def build(src: Path, weight: int, bucket: str, out_name: str, extra: dict[str, float]) -> tuple[int, int]:
    text = read_chars(bucket)
    font = TTFont(src, lazy=False)
    if "fvar" in font:
        axes = {a.axisTag: a for a in font["fvar"].axes}
        # 每条轴都要 pin 死，漏一条就还是可变字体
        loc = {tag: a.defaultValue for tag, a in axes.items()}
        for tag, val in extra.items():
            if tag in axes:
                a = axes[tag]
                loc[tag] = max(a.minValue, min(a.maxValue, val))
        if "wght" in axes:
            w = axes["wght"]
            loc["wght"] = max(w.minValue, min(w.maxValue, weight))
        font = instancer.instantiateVariableFont(font, loc, inplace=True, updateFontNames=False)

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
    for src, weight, bucket, out_name, lic, extra in JOBS:
        if not src.exists():
            sys.exit(f"缺少源字体 {src}")
        n, size = build(src, weight, bucket, out_name, extra)
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
