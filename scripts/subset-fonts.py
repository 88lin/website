#!/usr/bin/env python3
"""
按站点实际用到的字形子集化字体，输出 WOFF2 到 public/fonts/。
中文只子集 src/content/site.ts 与各 section 里真实出现的汉字，
因此得意黑从 5MB 级降到几十 KB。
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
OUT = ROOT / "public" / "fonts"
FONTS = Path("/workspace/fonts")
OUT.mkdir(parents=True, exist_ok=True)

# ---- 收集站点实际使用的字符 -------------------------------------------------
text = []
for p in list(SRC.rglob("*.ts")) + list(SRC.rglob("*.tsx")) + [ROOT / "index.html"]:
    text.append(p.read_text(encoding="utf-8"))
blob = "\n".join(text)

cjk = set(re.findall(r"[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]", blob))
latin = set(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    " .,:;!?'\"()[]{}<>/\\|-_+=*&^%$#@~`\u00b7\u2026\u2192\u2190\u00d7\u00b0\u2022"
)
# 数字与常见符号务必齐全（数据条全是等宽数字）
common = set("0123456789,.%+-/ ")

cn_chars = "".join(sorted(cjk | common | set(" ")))
latin_chars = "".join(sorted(latin | common))

print(f"CJK glyphs in source: {len(cjk)}")

# ---- 得意黑只挂在 .display 上，不需要全站汉字 --------------------------------
# scripts/display-chars.mjs 会遍历构建产物的 DOM，按 computed font-family
# 精确采集真正用标题字渲染的字符。有这份清单就用它（100 KB -> 30 KB 级），
# 没有就退回全站汉字，保证首次构建不会掉字。
DISPLAY_LIST = ROOT / "scripts" / "display-chars.txt"
if DISPLAY_LIST.exists():
    display_chars = "".join(sorted(set(DISPLAY_LIST.read_text(encoding="utf-8")) | common | latin))
    n_cjk = len([c for c in display_chars if "\u4e00" <= c <= "\u9fff"])
    print(f"display subset: {len(display_chars)} glyphs ({n_cjk} CJK) from display-chars.txt")
else:
    display_chars = cn_chars + latin_chars
    print("display subset: display-chars.txt 缺失，回退到全站汉字")


def subset(src: Path, dest: Path, chars: str, extra_args=None):
    args = [
        sys.executable,
        "-m",
        "fontTools.subset",
        str(src),
        f"--text={chars}",
        "--layout-features=kern,liga,calt,tnum",
        "--flavor=woff2",
        "--no-hinting",
        "--desubroutinize",
        f"--output-file={dest}",
    ]
    if extra_args:
        args += extra_args
    subprocess.run(args, check=True, capture_output=True)
    kb = dest.stat().st_size / 1024
    print(f"{dest.name:28s} {kb:7.1f} KB")


# ---- 得意黑（中文标题） ------------------------------------------------------
subset(FONTS / "smiley" / "SmileySans-Oblique.ttf", OUT / "SmileySans-Display.woff2", display_chars)

# ---- Geist（拉丁正文/标题） --------------------------------------------------
GEIST = FONTS / "geist" / "geist-font" / "Geist" / "webfonts"
GEIST_MONO = FONTS / "geist" / "geist-font" / "GeistMono" / "webfonts"
subset(GEIST / "Geist-Medium.woff2", OUT / "Geist-Medium.woff2", latin_chars)
subset(GEIST / "Geist-Bold.woff2", OUT / "Geist-Bold.woff2", latin_chars)
subset(GEIST_MONO / "GeistMono-Medium.woff2", OUT / "GeistMono-Medium.woff2", latin_chars)

total = sum(f.stat().st_size for f in OUT.glob("*.woff2")) / 1024
print(f"\nTOTAL FONT PAYLOAD: {total:.1f} KB")
