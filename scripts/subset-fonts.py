#!/usr/bin/env python3
"""
按站点实际用到的字形子集化字体，输出 WOFF2 到 public/fonts/。

字体策略（v3，取自 88lin/mydesign-system 的推荐池）：
  标题拉丁 / 数字  Fraunces   —— 可变字体，先把 opsz/SOFT/WONK 定死，只保留 wght
  标题中文        Noto Serif SC —— 定到 wght=600，按真实标题用字收窄
  手写点缀        Caveat     —— 只做拉丁与数字
  正文            苹果设备命中系统苹方 / SF，不下载 webfont；其余回退 Noto Sans SC

中文只子集源码里真实出现的汉字；标题衬线与 Semibold 再按 display-chars.txt
（scripts/display-chars.mjs 遍历真实 DOM、按 computed font-weight 采集）收窄。

首次执行时 display-chars.txt 可能还没有对应新版式，流程是：
  1) 先跑一遍（标题子集回退到全站汉字） 2) npm run build 3) node scripts/display-chars.mjs
  4) 再跑一遍收窄。
"""
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
OUT = ROOT / "public" / "fonts"
DS = Path("/workspace/fonts/ds")  # Fraunces / Caveat / NotoSerifSC（google/fonts，OFL）
NOTO_SANS = Path("/workspace/fonts/noto/NotoSansSC.ttf")

OUT.mkdir(parents=True, exist_ok=True)
for stale in OUT.glob("*.woff2"):
    stale.unlink()
(OUT / "LICENSE-Inter.txt").unlink(missing_ok=True)  # v3 已彻底移除 Inter

# ---- 收集站点实际使用的字符 -------------------------------------------------
text = []
for p in list(SRC.rglob("*.ts")) + list(SRC.rglob("*.tsx")) + [ROOT / "index.html"]:
    text.append(p.read_text(encoding="utf-8"))
blob = "\n".join(text)
# 注释里的中文永远不会渲染，先剥掉（可省 ~20% 汉字）
blob = re.sub(r"/\*.*?\*/", "", blob, flags=re.S)
blob = re.sub(r"^\s*//.*$", "", blob, flags=re.M)
blob = re.sub(r"<!--.*?-->", "", blob, flags=re.S)

cjk = set(re.findall(r"[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]", blob))
latin = set(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    " .,:;!?'\"()[]{}<>/\\|-_+=*&^%$#@~`\u00b7\u2026\u2192\u2190\u00d7\u00b0\u2022"
    "\u2018\u2019\u201c\u201d\u2013\u2014\u00a9\u2605\u2042"
)
common = set("0123456789,.%+-/ ")

cn_chars = "".join(sorted(cjk | common | {" "}))
latin_chars = "".join(sorted(latin | common))
print(f"CJK glyphs in source: {len(cjk)}")

# ---- 两份收窄清单：衬线标题一份、无衬线中黑一份 ------------------------------
# 由 scripts/display-chars.mjs 遍历真实 DOM 生成。共用一份会互相连坐：
# Serif 会被 55 篇文章标题拖胖，Semibold 会被大标题拖胖。


def narrow(name: str, label: str) -> str:
    path = ROOT / "scripts" / name
    if not path.exists():
        print(f"{label}: {name} 缺失，回退到全站汉字（{len(cjk)}）")
        return cn_chars
    picked = set(path.read_text(encoding="utf-8")) & cjk
    print(f"{label}: {len(picked)} 汉字 ← {name}")
    return "".join(sorted(picked | common | {" "}))


serif_chars = narrow("serif-chars.txt", "衬线标题子集")
display_chars = narrow("display-chars.txt", "无衬线中黑子集")


def subset(src: Path, dest: Path, chars: str, extra_args=None):
    args = [
        sys.executable,
        "-m",
        "fontTools.subset",
        str(src),
        f"--text={chars}",
        "--layout-features=kern,liga,calt,tnum,ccmp,locl",
        "--flavor=woff2",
        "--no-hinting",
        "--desubroutinize",
        f"--output-file={dest}",
    ]
    if extra_args:
        args += extra_args
    subprocess.run(args, check=True, capture_output=True)
    kb = dest.stat().st_size / 1024
    print(f"{dest.name:30s} {kb:7.1f} KB")


def instance(src: Path, out: Path, axes: dict):
    """把不需要的可变轴定死，只留下 CSS 真正会调的那一条。"""
    subprocess.run(
        [sys.executable, "-m", "fontTools.varLib.instancer", str(src)]
        + [f"{k}={v}" for k, v in axes.items()]
        + ["-o", str(out)],
        check=True,
        capture_output=True,
    )


def pin_and_subset(src: Path, dest: Path, axes: dict, chars: str):
    with tempfile.TemporaryDirectory() as td:
        pinned = Path(td) / "pinned.ttf"
        instance(src, pinned, axes)
        subset(pinned, dest, chars)


# ---- Fraunces：opsz/SOFT/WONK 定死，wght 轴保留（300–900） -------------------
# opsz=48 是「大标题」光学尺寸；SOFT=0 保持硬边；WONK=1 留下那点歪脖子 g/y。
pin_and_subset(
    DS / "Fraunces.ttf",
    OUT / "Fraunces.woff2",
    {"opsz": 48, "SOFT": 0, "WONK": 1, "wght": "100:900"},
    latin_chars,
)

# ---- Caveat：手写点缀，只有编号和几句批注 ------------------------------------
# .hand 恒定 600，保留 wght 轴要多背 ~18 KB delta，直接定死。
# 字符集只取 <Note> 里真正出现的拉丁字符 + 数字 + 箭头：整份拉丁要 36 KB，
# 这样只要 4 KB。Caveat 没有汉字，中文批注会落回正文栈（见 --font-hand）。
hand_text = "".join(re.findall(r"<Note[^>]*>(.*?)</Note>", blob, flags=re.S))
hand_chars = "".join(
    sorted({c for c in hand_text if c.isascii() or c in "—–·↑→←"} | set("0123456789 —·↑→"))
)
print(f"hand subset: {len(hand_chars)} chars -> {hand_chars!r}")
pin_and_subset(
    DS / "Caveat.ttf",
    OUT / "Caveat.woff2",
    {"wght": 600},
    hand_chars,
)

# ---- Noto Serif SC：中文标题，定到 600，只留标题用字 -------------------------
pin_and_subset(
    DS / "NotoSerifSC.ttf",
    OUT / "NotoSerifSC-Display.woff2",
    {"wght": 600},
    serif_chars,
)

# ---- Noto Sans SC：正文兜底（苹果设备用不到） --------------------------------
pin_and_subset(NOTO_SANS, OUT / "NotoSansSC-Regular.woff2", {"wght": 400}, cn_chars)
pin_and_subset(NOTO_SANS, OUT / "NotoSansSC-Semibold.woff2", {"wght": 600}, display_chars)

# ---- 许可证随产物一起发布 ----------------------------------------------------
shutil.copy(DS / "OFL-Fraunces.txt", OUT / "LICENSE-Fraunces.txt")
shutil.copy(DS / "OFL-Caveat.txt", OUT / "LICENSE-Caveat.txt")
shutil.copy(DS / "OFL-NotoSerifSC.txt", OUT / "LICENSE-NotoSerifSC.txt")

total = sum(f.stat().st_size for f in OUT.glob("*.woff2")) / 1024
print(f"\nTOTAL FONT PAYLOAD: {total:.1f} KB")
