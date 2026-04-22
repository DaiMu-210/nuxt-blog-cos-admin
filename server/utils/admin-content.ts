import { readdir, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, isAbsolute } from 'node:path';
import { createError } from 'h3';
import matter from 'gray-matter';

export type AdminPostListItem = {
  slug: string;
  filePath: string;
  title?: string;
  description?: string;
  date?: string;
  category?: string;
  tags?: string[];
  draft?: boolean;
  updatedAt?: string;
};

function normalizeDate(input: any): string | undefined {
  if (!input) return undefined;
  if (input instanceof Date) return input.toISOString().slice(0, 10);
  if (typeof input === 'number') return new Date(input).toISOString().slice(0, 10);
  if (typeof input === 'string') return input;
  return String(input);
}

function normalizeTags(input: any): string[] | undefined {
  if (!input) return undefined;
  if (Array.isArray(input)) return input.map(String);
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [String(input)];
}

function normalizeMeta(meta: Record<string, any>): Record<string, any> & { date?: string; tags?: string[] } {
  return {
    ...meta,
    date: normalizeDate(meta?.date),
    tags: normalizeTags(meta?.tags),
  };
}

export function assertAdminEnabled() {
  // 仅允许本地开发环境使用（避免把“写文件能力”带到线上）
  const desktopMode = (process.env.NUXT_DESKTOP || '').trim() === '1';
  const enabled = (import.meta.dev || desktopMode) && process.env.NUXT_ADMIN_ENABLED !== 'false';
  if (!enabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }
}

export function getPostsDir() {
  return resolve(process.cwd(), 'content', 'posts');
}

function safeResolvePostPath(slug: string) {
  const postsDir = getPostsDir();
  const filePath = resolve(postsDir, `${slug}.md`);
  const rel = relative(postsDir, filePath);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw createError({ statusCode: 400, statusMessage: '非法路径' });
  }
  return filePath;
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

export async function listPosts(): Promise<AdminPostListItem[]> {
  const postsDir = getPostsDir();
  await mkdir(postsDir, { recursive: true });
  const allFiles = (await walk(postsDir)).filter((f) => f.endsWith('.md'));

  const items: AdminPostListItem[] = [];
  for (const file of allFiles) {
    const slug = relative(postsDir, file).replace(/\\/g, '/').replace(/\.md$/, '');
    const raw = await readFile(file, 'utf8');
    const parsed = matter(raw);
    const meta = normalizeMeta((parsed.data ?? {}) as Record<string, any>);
    const st = await stat(file);
    items.push({
      slug,
      filePath: `content/posts/${slug}.md`,
      title: meta.title,
      description: meta.description,
      date: meta.date,
      category: meta.category,
      tags: meta.tags,
      draft: meta.draft,
      updatedAt: st.mtime.toISOString(),
    });
  }

  items.sort(
    (a, b) =>
      String(b.date || '').localeCompare(String(a.date || '')) ||
      String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
  );
  return items;
}

export async function readPost(slug: string) {
  const filePath = safeResolvePostPath(slug);
  const markdown = await readFile(filePath, 'utf8');
  const parsed = matter(markdown);
  return {
    slug,
    meta: normalizeMeta((parsed.data ?? {}) as Record<string, any>),
    body: parsed.content ?? '',
  };
}

export async function writePost(
  slug: string,
  input:
    | { markdown: string }
    | {
        meta: Record<string, any>;
        body: string;
      },
) {
  const filePath = safeResolvePostPath(slug);
  await mkdir(dirname(filePath), { recursive: true });
  const markdown = 'markdown' in input ? input.markdown : matter.stringify(input.body ?? '', input.meta ?? {});
  await writeFile(filePath, (markdown || '').trimEnd() + '\n', 'utf8');
  return { ok: true };
}

export async function deletePost(slug: string) {
  const filePath = safeResolvePostPath(slug);
  await rm(filePath, { force: true });
  return { ok: true };
}
