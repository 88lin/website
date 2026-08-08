import type { Project } from '../content/site'
import { asset } from '../lib/asset'

/** 有线上站点的项目用真实截图，其余用排印封面。 */
const SHOTS: Record<string, string> = {
  'cover-lofi': 'lofi',
  'cover-repair': 'repair',
  'cover-gzh': 'gzh',
}

/** 排印封面的三种配色，全部走语义 token。 */
const TYPO: Record<string, { field: string; text: string; meta: string }> = {
  'cover-wesum': { field: 'bg-brand-surface', text: 'text-on-brand', meta: 'text-on-brand' },
  'cover-diataxis': { field: 'bg-highlight-soft', text: 'text-ink', meta: 'text-ink-light' },
  'cover-video': { field: 'bg-dark-panel', text: 'text-on-dark', meta: 'text-on-dark-dim' },
}

export function Cover({ project }: { project: Project }) {
  const shot = SHOTS[project.cover]

  if (shot) {
    return (
      <div className="work-card__shot aspect-[16/10] w-full bg-preview">
        <img
          src={asset(`covers/${shot}.webp`)}
          alt={`${project.name} 界面截图`}
          width={1200}
          height={750}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-top"
        />
      </div>
    )
  }

  const t = TYPO[project.cover] ?? TYPO['cover-diataxis']
  return (
    <div className={`work-card__shot relative aspect-[16/10] w-full ${t.field}`}>
      <div className="absolute inset-0 flex flex-col justify-between p-6">
        <span className={`eyebrow ${t.meta}`}>{project.kind}</span>
        <span className={`serif block text-[clamp(1.6rem,3.4vw,2.2rem)] leading-[1.1] ${t.text}`}>
          {project.cn}
        </span>
      </div>
    </div>
  )
}
