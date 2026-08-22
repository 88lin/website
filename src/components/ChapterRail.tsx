/**
 * 章序轨：固定在左边空白里的一条编号索引。
 *
 * 为什么要有它：这一页有七章、九屏高，而顶栏只放得下三个锚点。读者滚到第五屏时
 * 既不知道自己在第几章，也没有直达任何一章的入口 —— 全靠往回搓滚轮。
 *
 * 形态上只出现编号与一根短横。当前章的横加长、染色；hover 整条轨才把章名滑出来。
 * 常显章名会压到正文上（版心 1280 居中，左边空白只有 130px 上下），
 * 而 hover 是短暂的，压一下没关系。
 *
 * 只在 ≥1240px 出现：再窄的屏幕左边没有空白可用，硬塞就是遮字。
 * 窄屏读者靠顶栏的三个锚点与连续滚动，不损失任何内容。
 */

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
