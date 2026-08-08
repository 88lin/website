#!/usr/bin/env python3
"""生成 src/content/writing.ts —— 博客文章真实清单。

数据源：https://blog.88lin.eu.org/archive 页面里的 __NEXT_DATA__（NotionNext 把
整站文章表直接序列化在 HTML 里）。字段 title / slug / category / tags /
date.start_date / summary / pageIcon 全部来自博客数据库本身，比逐页刮 og:meta
更权威——实测有 1 篇（article/33）文章页 meta 全空、1 篇（article/52）og:section
误写成 tag 串，归档 JSON 里这两条都是干净的。

用法：
    curl -sSL -A 'Mozilla/5.0' https://blog.88lin.eu.org/archive -o /tmp/blog-archive.html
    python3 scripts/gen-writing.py /tmp/blog-archive.html
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / 'ref' / 'blog-archive.html'
OUT = ROOT / 'src' / 'content' / 'writing.ts'
if not SRC.is_file():
    raise SystemExit(f'找不到归档页 HTML：{SRC}\n先 curl 下来，或把路径作为第一个参数传进来')

html = SRC.read_text(encoding='utf-8', errors='replace')
blob = re.search(
    r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S
)
if not blob:
    raise SystemExit('__NEXT_DATA__ not found — 归档页结构变了，先人工看一眼')

pp = json.loads(blob.group(1))['props']['pageProps']
raw = [p for p in pp['posts'] if p.get('status') == 'Published' and p.get('type') == 'Post']
official_cats = pp['categoryOptions']
official_count = pp['postCount']

WS = re.compile(r'\s+')


def clean(s: str) -> str:
    return WS.sub(' ', (s or '').replace('"', '"').replace('"', '"')).strip()


rows = []
for p in raw:
    slug = str(p['slug']).replace('article/', '')
    rows.append(
        {
            'slug': slug,
            'title': clean(p.get('title')),
            'cat': clean(p.get('category')),
            'date': ((p.get('date') or {}).get('start_date') or '')[:10],
            'icon': (p.get('pageIcon') or '').strip(),
        }
    )

rows.sort(key=lambda r: r['date'] or '0000-00-00', reverse=True)

years = Counter(r['date'][:4] for r in rows if r['date'])
assert len(rows) == official_count, f'{len(rows)} != postCount {official_count}'


def esc(s: str) -> str:
    return s.replace('\\', '\\\\').replace("'", "\\'")


L = [
    '/**',
    ' * 博客文章清单 —— 机器生成，勿手改。',
    ' *',
    ' * 来源：blog.88lin.eu.org/archive 的 __NEXT_DATA__（博客数据库原始记录）。',
    ' * 重新生成：scripts/gen-writing.py，步骤见 README「数据刷新」。',
    f' * 快照时间 2026-08-08，共 {len(rows)} 篇。',
    ' */',
    '',
    'export type Post = {',
    '  slug: string',
    '  title: string',
    '  /** 博客里的分类。有 1 篇在数据库里就是空的，保持为空，不臆造。 */',
    '  cat: string',
    '  date: string',
    '  icon: string',
    '}',
    '',
    "export const BLOG = 'https://blog.88lin.eu.org'",
    'export const postHref = (slug: string) => `${BLOG}/article/${slug}`',
    '',
    'export const posts: Post[] = [',
]
for r in rows:
    L.append(
        "  { slug: '%s', title: '%s', cat: '%s', date: '%s', icon: '%s' },"
        % (esc(r['slug']), esc(r['title']), esc(r['cat']), r['date'], esc(r['icon']))
    )
L += [
    ']',
    '',
    '/** 分类与计数，直接取博客自己的 categoryOptions，不是我数出来的。 */',
    'export const postCategories: { name: string; count: number }[] = [',
]
for c in sorted(official_cats, key=lambda c: -c['count']):
    L.append("  { name: '%s', count: %d }," % (esc(c['name']), c['count']))
L += [
    ']',
    '',
    '/** 按年份的产出分布，用于左栏条形。 */',
    'export const postYears: { year: string; count: number }[] = [',
]
for y in sorted(years, reverse=True):
    L.append("  { year: '%s', count: %d }," % (y, years[y]))
L += [
    ']',
    '',
    f'export const postCount = {official_count}',
    f'export const yearMax = {max(years.values())}',
    '',
]

OUT.write_text('\n'.join(L), encoding='utf-8')
print(f'wrote {OUT}  posts={len(rows)}  cats={len(official_cats)}  years={dict(years)}')
print('empty cat:', [r['slug'] for r in rows if not r['cat']])
