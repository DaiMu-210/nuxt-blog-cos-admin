export type DesktopPostListItem = {
  slug: string;
  path: string;
  title?: string;
  description?: string;
  date?: string;
  category?: string;
  tags?: string[];
  draft?: boolean;
  updatedAt?: string;
};

export type DesktopPostDetail = {
  slug: string;
  meta: Record<string, any>;
  body: string;
};

export type SiteData = {
  title: string;
  since?: string;
  avatar?: string;
  name?: string;
  bio?: string;
  intro?: string;
  social?: Array<{ label: string; url: string }>;
  projects?: Array<{ name: string; url: string; desc?: string; icon?: string }>;
  comments?: {
    beaudarRepo?: string;
    beaudarTheme?: string;
    beaudarOrigin?: string;
    beaudarBranch?: string;
  };
  home?: {
    pinnedSlugs?: string[];
    featuredSlugs?: string[];
    latestCount?: number;
    showStats?: boolean;
  };
};

export type LinksData = {
  groups: Array<{
    name: string;
    items: Array<{
      title: string;
      url: string;
      desc?: string;
      avatar?: string;
    }>;
  }>;
};

export function useIsDesktopProduction() {
  const cfg = useRuntimeConfig();
  const desktopMode = Boolean((cfg as any)?.public?.desktopMode);
  return computed(() => desktopMode && !import.meta.dev);
}

export function useSiteData(key = 'site') {
  const isDesktopProd = useIsDesktopProduction();
  return useAsyncData<SiteData | null>(key, async () => {
    if (isDesktopProd.value) return await $fetch<SiteData>('/api/desktop/site');
    return (await queryCollection('site').first()) as SiteData | null;
  });
}

export function useLinksData(key = 'links') {
  const isDesktopProd = useIsDesktopProduction();
  return useAsyncData<LinksData | null>(key, async () => {
    if (isDesktopProd.value) return await $fetch<LinksData>('/api/desktop/links');
    return (await queryCollection('links').first()) as LinksData | null;
  });
}

export function usePostsList(key = 'posts') {
  const isDesktopProd = useIsDesktopProduction();
  return useAsyncData<DesktopPostListItem[] | any[]>(key, async () => {
    if (isDesktopProd.value) {
      const list = await $fetch<any[]>('/api/desktop/posts');
      return (list ?? []).map((p: any) => ({
        ...p,
        path: `/posts/${String(p.slug || '').replace(/^\/+/, '')}`,
      })) as DesktopPostListItem[];
    }
    return (await queryCollection('posts').order('date', 'DESC').all()) as any[];
  });
}

export function usePostDetail(slug: string) {
  const isDesktopProd = useIsDesktopProduction();
  const safeSlug = String(slug || '').replace(/^\/+/, '');
  return useAsyncData<DesktopPostDetail | any | null>(
    () => `post:${safeSlug}`,
    async () => {
      if (isDesktopProd.value) return await $fetch<DesktopPostDetail>(`/api/desktop/posts/${safeSlug}`);
      return (await queryCollection('posts').path(`/posts/${safeSlug}`).first()) as any | null;
    },
  );
}
