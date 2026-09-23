/* 左侧章序轨：固定在版心外的编号索引，只在 ≥1240px 出现。 */

import { chapters } from '../content/site'
import { useActiveSection } from '../lib/motion'

const IDS = chapters.map((c) => c.id)

export function ChapterRail() {
  const active = useActiveSection(IDS)

  return (
    <nav className="crail" aria-label="章节索引">
      {chapters.map((c) => (
        <a
          key={c.id}
          href={`#${c.id}`}
          data-on={active === c.id ? '1' : undefined}
          aria-current={active === c.id ? 'true' : undefined}
        >
          <i aria-hidden="true" />
          <b>{c.no}</b>
          <span>{c.label}</span>
        </a>
      ))}
    </nav>
  )
}
