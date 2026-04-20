type PostListItem = {
  slug: string
  title?: string
  date?: string
  tags?: string[]
  category?: string
  draft?: boolean
  updatedAt?: string
}

type LinksData = {
  groups: Array<{
    name: string
    items: Array<{ title: string; url: string; desc?: string; avatar?: string }>
  }>
}

export function useAdminStats() {
  const postsReq = useFetch<PostListItem[]>('/api/admin/posts', { server: false })
  const linksReq = useFetch<LinksData>('/api/admin/links', { server: false })

  const stats = computed(() => {
    const posts = postsReq.data.value ?? []
    const links = linksReq.data.value

    const categories = new Set<string>()
    const tags = new Set<string>()
    let drafts = 0

    for (const p of posts) {
      if (p.draft) drafts++
      categories.add(String(p.category || '未分类'))
      for (const t of p.tags ?? []) tags.add(String(t))
    }

    const linksCount = (links?.groups ?? []).reduce((sum, g) => sum + (g.items?.length ?? 0), 0)

    return {
      posts: posts.length,
      drafts,
      categories: categories.size,
      tags: tags.size,
      links: linksCount
    }
  })

  return {
    postsReq,
    linksReq,
    stats
  }
}

