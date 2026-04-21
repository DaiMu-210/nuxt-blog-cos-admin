import { defineCollection, defineContentConfig } from '@nuxt/content';
import { z } from 'zod';

export default defineContentConfig({
  collections: {
    posts: defineCollection({
      type: 'page',
      source: 'posts/**/*.md',
      schema: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        date: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        draft: z.boolean().optional(),
      }),
    }),

    site: defineCollection({
      type: 'data',
      source: 'site.json',
      schema: z.object({
        title: z.string(),
        since: z.string().optional(),
        avatar: z.string().optional(),
        name: z.string().optional(),
        bio: z.string().optional(),
        intro: z.string().optional(),
        social: z
          .array(
            z.object({
              label: z.string(),
              url: z.string(),
            }),
          )
          .optional(),
        projects: z
          .array(
            z.object({
              name: z.string(),
              url: z.string(),
              desc: z.string().optional(),
              icon: z.string().optional(),
            }),
          )
          .optional(),
        comments: z
          .object({
            beaudarRepo: z.string().optional(),
            beaudarTheme: z.string().optional(),
          })
          .optional(),
        home: z
          .object({
            pinnedSlugs: z.array(z.string()).optional(),
            featuredSlugs: z.array(z.string()).optional(),
            latestCount: z.number().optional(),
            showStats: z.boolean().optional(),
          })
          .optional(),
      }),
    }),

    links: defineCollection({
      type: 'data',
      source: 'links.json',
      schema: z.object({
        groups: z.array(
          z.object({
            name: z.string(),
            items: z.array(
              z.object({
                title: z.string(),
                url: z.string(),
                desc: z.string().optional(),
                avatar: z.string().optional(),
              }),
            ),
          }),
        ),
      }),
    }),
  },
});
