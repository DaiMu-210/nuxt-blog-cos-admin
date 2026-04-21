import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import matter from 'gray-matter';
import { defineEventHandler, setHeader, getRequestURL } from 'h3';

type RssItem = {
  title: string;
  link: string;
  guid: string;
  pubDate: string;
  description?: string;
};

function escapeXml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function walk(dir: string): Promise<string[]> {
  const ents = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const ent of ents) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) files.push(...(await walk(p)));
    else files.push(p);
  }
  return files;
}

function normalizeDate(input: any): Date | null {
  if (!input) return null;
  if (input instanceof Date && !Number.isNaN(input.getTime())) return input;
  if (typeof input === 'number') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'string') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(String(input));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function readSiteTitle() {
  try {
    const p = resolve(process.cwd(), 'content', 'site.json');
    const raw = await readFile(p, 'utf8');
    const json = JSON.parse(raw) as any;
    return typeof json?.title === 'string' && json.title.trim() ? json.title.trim() : '我的博客';
  } catch {
    return '我的博客';
  }
}

async function buildItems(baseUrl: string): Promise<RssItem[]> {
  const postsDir = resolve(process.cwd(), 'content', 'posts');
  let files: string[] = [];
  try {
    files = (await walk(postsDir)).filter((f) => f.endsWith('.md'));
  } catch {
    files = [];
  }

  const items: Array<RssItem & { sortTs: number }> = [];
  for (const file of files) {
    const slug = relative(postsDir, file).replace(/\\/g, '/').replace(/\.md$/, '');
    const raw = await readFile(file, 'utf8');
    const parsed = matter(raw);
    const meta = (parsed.data ?? {}) as any;
    if (meta?.draft) continue;

    const st = await stat(file);
    const d = normalizeDate(meta?.date) ?? st.mtime;
    const link = `${baseUrl}/posts/${encodeURI(slug)}`;
    items.push({
      title: String(meta?.title || slug),
      link,
      guid: link,
      pubDate: d.toUTCString(),
      description: meta?.description ? String(meta.description) : undefined,
      sortTs: d.getTime(),
    });
  }

  items.sort((a, b) => b.sortTs - a.sortTs);
  return items.map(({ sortTs, ...it }) => it);
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const url = getRequestURL(event);
  const baseUrl = (config.public as any)?.siteUrl || `${url.protocol}//${url.host}`;

  const title = await readSiteTitle();
  const items = await buildItems(String(baseUrl).replace(/\/+$/, ''));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '<channel>',
    `<title>${escapeXml(title)}</title>`,
    `<link>${escapeXml(String(baseUrl).replace(/\/+$/, ''))}</link>`,
    `<description>${escapeXml(`${title} 的文章订阅`)}</description>`,
    `<language>zh-CN</language>`,
    `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    ...items.map((it) => {
      const desc = it.description ? `<description>${escapeXml(it.description)}</description>` : '';
      return [
        '<item>',
        `<title>${escapeXml(it.title)}</title>`,
        `<link>${escapeXml(it.link)}</link>`,
        `<guid isPermaLink="true">${escapeXml(it.guid)}</guid>`,
        `<pubDate>${escapeXml(it.pubDate)}</pubDate>`,
        desc,
        '</item>',
      ]
        .filter(Boolean)
        .join('');
    }),
    '</channel>',
    '</rss>',
  ].join('');

  setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8');
  return xml;
});
