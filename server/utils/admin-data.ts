import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createError } from 'h3';
import { assertAdminEnabled } from './admin-content';

function getContentPath(relPath: string) {
  return resolve(process.cwd(), 'content', relPath);
}

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

export async function readSite(): Promise<SiteData> {
  assertAdminEnabled();
  const p = getContentPath('site.json');
  try {
    const raw = await readFile(p, 'utf8');
    return JSON.parse(raw) as SiteData;
  } catch (e: any) {
    if (e?.code === 'ENOENT') {
      return { title: '我的博客', home: { latestCount: 10, showStats: true } };
    }
    throw createError({ statusCode: 500, statusMessage: '读取 site.json 失败' });
  }
}

export async function writeSite(data: SiteData) {
  assertAdminEnabled();
  if (!data?.title) throw createError({ statusCode: 400, statusMessage: 'site.title 不能为空' });
  const p = getContentPath('site.json');
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return { ok: true };
}

export async function readLinks(): Promise<LinksData> {
  assertAdminEnabled();
  const p = getContentPath('links.json');
  try {
    const raw = await readFile(p, 'utf8');
    return JSON.parse(raw) as LinksData;
  } catch (e: any) {
    if (e?.code === 'ENOENT') return { groups: [] };
    throw createError({ statusCode: 500, statusMessage: '读取 links.json 失败' });
  }
}

export async function writeLinks(data: LinksData) {
  assertAdminEnabled();
  const p = getContentPath('links.json');
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return { ok: true };
}
