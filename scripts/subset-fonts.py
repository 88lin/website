#!/usr/bin/env python3
"""
按站点实际用到的字形子集化字体，输出 WOFF2 到 public/fonts/。

字体策略（v2）：
  苹果设备走系统的 SF Pro + 苹方，不下载任何 webfont（CSS 里 -apple-system 排第一）。
  非苹果设备兜底：拉丁 = Inter / Inter Display（OFL），中文 = Noto Sans SC（OFL）。
  Noto Sans SC 是可变字体，先用 varLib.instancer 定到目标字重再子集化。

中文只子集站点源码里真实出现的汉字；Semibold 中文再按 display-chars.txt
（由 scripts/display-chars.mjs 遍历真实 DOM、按 computed font-weight >= 550 采集）
进一步收窄，避免为几十个标题字背上整份 Semibold。
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
OUT = ROOT / "public" / "fonts"
FONTS = Path("/workspace/fonts")
OUT.mkdir(parents=True, exist_ok=True)
for stale in OUT.glob("*.woff2"):
    stale.unlink()

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
    "\u2018\u2019\u201c\u201d\u2013\u2014\u00a9"
)
common = set("0123456789,.%+-/ ")

cn_chars = "".join(sorted(cjk | common | set(" ")))
latin_chars = "".join(sorted(latin | common))
print(f"CJK glyphs in source: {len(cjk)}")

# ---- Semibold 中文只需要标题/强调用到的那些字 --------------------------------
DISPLAY_LIST = ROOT / "scripts" / "display-chars.txt"
if DISPLAY_LIST.exists():
    bold_set = set(DISPLAY_LIST.read_text(encoding="utf-8")) & cjk
    bold_chars = "".join(sorted(bold_set | common | set(" ")))
    print(f"semibold CJK subset: {len(bold_set)} CJK from display-chars.txt")
else:
    bold_chars = cn_chars
    print("semibold CJK subset: display-chars.txt 缺失，回退到全站汉字")


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


def instance_and_subset(src: Path, dest: Path, wght: float, chars: str):
    """可变字体先定轴再子集，避免把整条 wght 轴带进产物。"""
    with tempfile.TemporaryDirectory() as td:
        pinned = Path(td) / "pinned.ttf"
        subprocess.run(
            [
                sys.executable,
                "-m",
                "fontTools.varLib.instancer",
                str(src),
                f"wght={wght}",
                "-o",
                str(pinned),
            ],
            check=True,
            capture_output=True,
        )
        subset(pinned, dest, chars)


# ---- Inter / Inter Display（拉丁） ------------------------------------------
INTER = FONTS / "inter"
subset(INTER / "Inter-Regular.woff2", OUT / "Inter-Regular.woff2", latin_chars)
subset(INTER / "Inter-Medium.woff2", OUT / "Inter-Medium.woff2", latin_chars)
subset(INTER / "Inter-SemiBold.woff2", OUT / "Inter-SemiBold.woff2", latin_chars)
subset(INTER / "InterDisplay-SemiBold.woff2", OUT / "InterDisplay-SemiBold.woff2", latin_chars)
subset(INTER / "InterDisplay-Bold.woff2", OUT / "InterDisplay-Bold.woff2", latin_chars)

# ---- Noto Sans SC（中文兜底，苹果设备用不到） --------------------------------
NOTO = FONTS / "noto" / "NotoSansSC.ttf"
instance_and_subset(NOTO, OUT / "NotoSansSC-Regular.woff2", 400, cn_chars)
instance_and_subset(NOTO, OUT / "NotoSansSC-Semibold.woff2", 600, bold_chars)

total = sum(f.stat().st_size for f in OUT.glob("*.woff2")) / 1024
print(f"\nTOTAL FONT PAYLOAD: {total:.1f} KB")
