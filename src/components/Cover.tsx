import type { Project } from '../content/site'
import { asset } from '../lib/asset'

/** 有线上站点的项目用真实截图，其余用排印封面。 */
const SHOTS: Record<string, string> = {
  'cover-lofi': 'lofi',
  'cover-repair': 'repair',
  'cover-gzh': 'gzh',
}

const TYPO: Record<string, { field: string; text: string; ink: string }> = {
  'cover-wesum': { field: 'bg-cobalt', text: 'text-paper', ink: 'text-paper/55' },
  'cover-diataxis': { field: 'bg-paper-2', text: 'text-ink', ink: 'text-ink-60' },
  'cover-video': { field: 'bg-vermilion', text: 'text-ink', ink: 'text-ink/60' },
}

export function Cover({ project }: { project: Project }) {
  const shot = SHOTS[project.cover]

  if (shot) {
    const src = asset(`covers/${shot}.webp`)
    return (
      <div className="cover-stack relative aspect-[16/10] w-full overflow-hidden bg-[#05060f] isolate">
        <img
          src={src}
          alt={`${project.name} 界面截图`}
          width={1200}
          height={750}
          loading="lazy"
          decoding="async"
          className="base absolute inset-0 h-full w-full object-cover object-top"
        />
        <img
          src={src}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="ghost ghost-r absolute inset-0 h-full w-full object-cover object-top"
          style={{ filter: 'url(#chan-r)' }}
        />
        <img
          src={src}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="ghost ghost-b absolute inset-0 h-full w-full object-cover object-top"
          style={{ filter: 'url(#chan-c)' }}
        />
      </div>
    )
  }

  const t = TYPO[project.cover] ?? TYPO['cover-diataxis']
  return (
    <div className={`relative aspect-[16/10] w-full overflow-hidden ${t.field}`}>
      <div className="grid-tex absolute inset-0 opacity-60" aria-hidden />
      <div className="absolute inset-0 flex flex-col justify-between p-6">
        <span className={`mono text-[0.7rem] tracking-[0.18em] ${t.ink}`}>{project.slug}</span>
        <span
          className={`display block max-w-full text-[clamp(2rem,4.4vw,3.2rem)] leading-[0.98] tracking-tight ${t.text}`}
        >
          {project.cn}
        </span>
      </div>
    </div>
  )
}

/** 通道分离滤镜，整站只需要一份。 */
export function ChannelFilters() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute" focusable="false">
      <defs>
        <filter id="chan-r" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
        <filter id="chan-c" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
        </filter>
      </defs>
    </svg>
  )
}
