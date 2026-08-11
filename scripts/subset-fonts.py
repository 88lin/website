#!/usr/bin/env python3
"""按站内实际用字做字体子集，输出 public/fonts/*.woff2。

流程：npm run build → npm run chars（浏览器采字）→ 本脚本（定轴 + 子集 + woff2）。

三条不肯让步的规则：
  1) **定轴**。可变字体（Noto Sans SC）直接子集会把整条 wght 轴带上，光轴数据
     就几百 KB。每个 @font-face 只要一个字重，所以先 instancer 定死，再子集。
     静态字体（得意黑 / JetBrains Mono / Caveat）没有 fvar，这一步自动跳过。
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
SRC_SMILEY = Path("/workspace/fonts/smiley")

# (源文件, 字重, 字符桶, 输出名, 许可证源文件, 额外定轴, 保留字距)
#
# v10 换字：展示档从思源黑 Black 换成 Fraunces（拉丁衬线），中文全部交给系统栈。
# 理由有两条，都不是审美偏好：
#   1) 思源黑的中日韩子集要 29 KB，占掉 40 KB 预算的七成，却只为了让标题比系统
#      黑体粗一点点 —— 同样的字节数买不到任何形状上的差异。
#   2) 本站标题是中英混排，中文块面 + 拉丁衬线的对比本身就是版式信息；两边都用
#      黑体反而分不出层级。拉丁子集只要 101 字，两档合起来 22 KB。
#
# Fraunces 是四轴可变字体（opsz 9–144 / wght 100–900 / SOFT 0–100 / WONK 0–1）。
# opsz 必须按各档的实际用途定死，不能吃默认值 9：
#   · 700 档只排 0.86–1.32rem 的小字（章节标签、卡片小标），opsz 定 24，
#     笔画对比低、字腔开，小字号下不糊。
#   · 900 档从 0.86rem 一路排到 11rem 的巨号编号，opsz 定 48 取折中 ——
#     再往上（96/144）发丝衬线在 1rem 处会直接消失。
# SOFT=0 取锐利端点；WONK=0 关掉那套古怪替换字形，本站只排大写与数字，
# 留着 WONK 只会在极少数字母上制造不一致。
JOBS = [
    (SRC_DS / "Fraunces.ttf", 700, "display", "Fraunces-700.woff2", "OFL-Fraunces.txt",
     {"opsz": 24, "SOFT": 0, "WONK": 0}, True),
    (SRC_DS / "Fraunces.ttf", 900, "display", "Fraunces-900.woff2", "OFL-Fraunces.txt",
     {"opsz": 48, "SOFT": 0, "WONK": 0}, True),
    (SRC_DS / "JetBrainsMono.ttf", 400, "mono", "JetBrainsMono-Regular.woff2", "OFL-JetBrainsMono.txt", {}, False),
    (SRC_DS / "Caveat.ttf", 600, "hand", "Caveat.woff2", "OFL-Caveat.txt", {}, False),
]

LICENSE_SRC = {
    "OFL-SmileySans.txt": SRC_SMILEY,
    "OFL-NotoSansSC.txt": SRC_NOTO,
    "OFL-Fraunces.txt": SRC_DS,
    "OFL-JetBrainsMono.txt": SRC_DS,
    "OFL-Caveat.txt": SRC_DS,
}

LICENSE_NAME = {
    "OFL-SmileySans.txt": "LICENSE-SmileySans.txt",
    "OFL-NotoSansSC.txt": "LICENSE-NotoSansSC.txt",
    "OFL-Fraunces.txt": "LICENSE-Fraunces.txt",
    "OFL-JetBrainsMono.txt": "LICENSE-JetBrainsMono.txt",
    "OFL-Caveat.txt": "LICENSE-Caveat.txt",
}

# 旧版留下的产物：字体已从 @font-face 里删掉，文件留着只会白占预算与仓库。
STALE = [
    "NotoSansSC-Regular.woff2",
    "NotoSansSC-Semibold.woff2",
    "NotoSansSC-Display.woff2",
    "LICENSE-NotoSansSC.txt",
    "SmileySans-Display.woff2",
    "LICENSE-SmileySans.txt",
    "Fraunces.woff2",
    "Fraunces-Numerals.woff2",
    "JetBrainsMono-Bold.woff2",
    "NotoSerifSC-Display.woff2",
    "ZhiMangXing.woff2",
    "LICENSE-NotoSerifSC.txt",
    "LICENSE-ZhiMangXing.txt",
]


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


def build(src: Path, weight: int, bucket: str, out_name: str, extra: dict[str, float],
          keep_kern: bool = False) -> tuple[int, int]:
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
    # 展示档要留 GPOS 的 kern：Fraunces 排的是 11rem 的编号与全大写英文，
    # "WORK THAT" 这种 K/T/A 连排缺了字距会松得一眼看出来。等宽与手写体不留 ——
    # 等宽本来就不该有字距调整，手写体只排几个短标签，省 GPOS 更划算。
    if keep_kern:
        opts.drop_tables += ["DSIG", "GSUB", "MATH", "BASE", "JSTF"]
        opts.layout_features = ["kern"]
    else:
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
    for src, weight, bucket, out_name, lic, extra, keep_kern in JOBS:
        if not src.exists():
            sys.exit(f"缺少源字体 {src}")
        n, size = build(src, weight, bucket, out_name, extra, keep_kern)
        total += size
        rows.append((out_name, weight, n, size))
        lic_src = LICENSE_SRC[lic] / lic
        if lic_src.exists():
            shutil.copyfile(lic_src, OUT / LICENSE_NAME[lic])

    width = max(len(r[0]) for r in rows)
    for out_name, weight, n, size in rows:
        print(f"{out_name:<{width}}  wght {weight:<3}  {n:>5} 字  {size / 1024:7.1f} KB")
    # 预算随字体策略一起收紧：正文两档改系统字之后只剩三个小子集，
    # 200 KB 的旧上限已经形同虚设，收到 40 KB 才继续有约束力。
    print(f"{'合计':<{width}}                       {total / 1024:7.1f} KB  / 预算 40 KB")
    if total > 40 * 1024:
        sys.exit("字体总量超预算")


if __name__ == "__main__":
    main()
