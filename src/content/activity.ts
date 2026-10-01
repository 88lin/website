import activity from './generated/activity.json'

export const AS_OF = activity.asOf.replace(/-/g, '.')
export const github = activity.github
export const blog = activity.blog
export const formatCount = (value: number) => value.toLocaleString('en-US')

export function repositoryStats(name: string) {
  const stats = (github.repositories as Record<string, { stars: number; forks: number }>)[name.toLowerCase()]
  if (!stats) throw new Error(`Missing repository statistics: ${name}`)
  return stats
}

export const repositoryStars = (name: string) => formatCount(repositoryStats(name).stars)
export const repositoryForks = (name: string) => formatCount(repositoryStats(name).forks)
export const repositoryProvenance = (name: string) => ({
  value: `${repositoryStars(name)} Star / ${repositoryForks(name)} Fork`,
  from: `GitHub API：GET /repos/88lin/${name}，${activity.asOf}`,
})
