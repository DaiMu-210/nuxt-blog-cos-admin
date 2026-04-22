<script setup lang="ts">
type TocLink = {
  id?: string;
  text?: string;
  depth?: number;
  children?: TocLink[];
};

type TocItem = {
  id: string;
  text: string;
  depth: 2 | 3;
  el?: HTMLElement;
};

const props = defineProps<{
  links?: TocLink[];
  contentEl: HTMLElement | null;
  refreshKey?: number;
}>();

const items = ref<TocItem[]>([]);
const activeId = ref<string>('');

const collapsed = ref(false); // 桌面端左侧面板是否收起为悬浮按钮
const overlayOpen = ref(false); // 悬浮目录弹层是否打开
const copiedId = ref<string>('');

const isMdUp = ref(false);
let mediaQuery: MediaQueryList | undefined;
let onMediaChange: ((ev: MediaQueryListEvent) => void) | undefined;

let io: IntersectionObserver | undefined;
let copyTimer: number | undefined;

function flattenLinks(links?: TocLink[]): TocItem[] {
  const out: TocItem[] = [];
  const walk = (arr?: TocLink[]) => {
    if (!arr?.length) return;
    for (const n of arr) {
      const depth = Number(n.depth);
      if ((depth === 2 || depth === 3) && n.text) {
        out.push({
          id: String(n.id || ''),
          text: String(n.text || ''),
          depth: depth as 2 | 3,
        });
      }
      if (n.children?.length) walk(n.children);
    }
  };
  walk(links);
  return out;
}

function slugify(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueId(base: string, used: Map<string, number>) {
  const key = base || 'section';
  const n = used.get(key) ?? 0;
  used.set(key, n + 1);
  return n === 0 ? key : `${key}-${n + 1}`;
}

function rebuild() {
  const root = props.contentEl;
  if (!root) return;

  const domHeadings = Array.from(root.querySelectorAll<HTMLElement>('h2, h3'));
  if (!domHeadings.length) {
    items.value = [];
    return;
  }

  const fromContentToc = flattenLinks(props.links);
  const used = new Map<string, number>();
  const nextItems: TocItem[] = [];

  for (const [i, el] of domHeadings.entries()) {
    const depth = el.tagName === 'H2' ? 2 : 3;
    const text = (el.textContent || '').trim();
    if (!text) continue;

    // 1) 先确保 DOM 上存在 id（满足需求：无 id 时生成并写入 DOM）
    let id = el.id?.trim();
    if (!id) {
      // 优先使用 content.toc 的 id（按顺序对齐）
      const candidate = fromContentToc[i]?.id?.trim();
      id = candidate || slugify(text);
      id = uniqueId(id, used);
      el.id = id;
    } else {
      id = uniqueId(id, used);
      // 如果重复，写回一个唯一值，避免多个标题共用同一个 hash
      if (el.id !== id) el.id = id;
    }

    // 提升滚动定位体验：避免标题被顶部区域遮挡（纯 Tailwind utility class）
    el.classList.add('scroll-mt-24');

    nextItems.push({ id, text, depth, el });
  }

  items.value = nextItems;

  // 2) 建立滚动高亮
  io?.disconnect();
  io = new IntersectionObserver(
    (entries) => {
      const visibles = entries.filter((e) => e.isIntersecting) as Array<
        IntersectionObserverEntry & { target: HTMLElement }
      >;
      if (!visibles.length) return;

      visibles.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      const top = visibles[0]?.target;
      if (top?.id) activeId.value = top.id;
    },
    { root: null, rootMargin: '0px 0px -70% 0px', threshold: 0 },
  );

  for (const it of nextItems) {
    if (it.el) io.observe(it.el);
  }

  // 初始 hash 高亮（如果有）
  if (!activeId.value && location.hash) {
    activeId.value = decodeURIComponent(location.hash.slice(1));
  }
}

function scrollTo(id: string) {
  const root = props.contentEl;
  if (!root) return;

  const el = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (!el) return;

  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  history.replaceState(null, '', `#${encodeURIComponent(id)}`);
  activeId.value = id;
  overlayOpen.value = false;
}

async function copyAnchor(id: string) {
  const url = `${location.origin}${location.pathname}${location.search}#${encodeURIComponent(id)}`;
  try {
    await navigator.clipboard.writeText(url);
    copiedId.value = id;
    if (copyTimer) window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      copiedId.value = '';
    }, 1200);
  } catch {
    // 忽略
  }
}

const showDesktopPanel = computed(() => isMdUp.value && !collapsed.value && items.value.length > 0);
const showFloatingButton = computed(() => (!isMdUp.value || collapsed.value) && items.value.length > 0);

watch(
  () => props.links,
  () => {
    // 等 DOM 完成渲染后再扫描
    nextTick(rebuild);
  },
  { deep: true },
);

watch(
  () => props.contentEl,
  () => nextTick(rebuild),
);

watch(
  () => props.refreshKey,
  () => nextTick(rebuild),
);

onMounted(() => {
  if (typeof window !== 'undefined') {
    mediaQuery = window.matchMedia('(min-width: 768px)');
    const update = () => {
      isMdUp.value = !!mediaQuery?.matches;
      // 从桌面切到移动端时，关闭面板与弹层一致性
      if (!isMdUp.value) collapsed.value = true;
    };
    update();
    onMediaChange = () => update();
    mediaQuery.addEventListener('change', onMediaChange);
  }
  rebuild();
});

onBeforeUnmount(() => {
  io?.disconnect();
  if (mediaQuery && onMediaChange) mediaQuery.removeEventListener('change', onMediaChange);
  if (copyTimer) window.clearTimeout(copyTimer);
});
</script>

<template>
  <!-- 桌面左侧面板 -->
  <aside v-if="showDesktopPanel" class="hidden md:block w-64 shrink-0 sticky top-2">
    <div class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm font-semibold text-slate-900 dark:text-slate-50">目录</div>
        <button class="tw-btn-ghost px-2 py-1 text-xs" type="button" @click="collapsed = true">收起</button>
      </div>

      <div
        class="mt-2 max-h-[calc(100vh-7rem)] overflow-auto pr-1 md:pr-0 tw-scrollbar">
        <ul class="space-y-1">
          <li v-for="it in items" :key="it.id">
            <div class="group flex items-center gap-2">
              <button
                type="button"
                class="flex-1 text-left rounded-lg px-2 py-1 text-sm transition"
                :class="[
                  it.depth === 3 ? 'pl-6 text-slate-600 dark:text-slate-300' : 'pl-2 text-slate-800 dark:text-slate-200',
                  activeId === it.id
                    ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900/60',
                ]"
                @click="scrollTo(it.id)">
                {{ it.text }}
              </button>
              <button
                type="button"
                class="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-slate-50"
                @click.stop="copyAnchor(it.id)">
                {{ copiedId === it.id ? '已复制' : '复制' }}
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </aside>

  <!-- 悬浮按钮（移动端默认；桌面收起后显示） -->
  <button
    v-if="showFloatingButton"
    type="button"
    class="fixed left-4 bottom-6 z-40 tw-btn-primary"
    @click="overlayOpen = true">
    目录
  </button>

  <!-- 悬浮弹层目录 -->
  <div v-if="overlayOpen" class="fixed inset-0 z-50">
    <button type="button" class="absolute inset-0 bg-black/40" @click="overlayOpen = false" />

    <div class="absolute left-4 bottom-20 w-[min(360px,calc(100vw-2rem))]">
      <div class="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden dark:border-slate-800 dark:bg-slate-950">
        <div class="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div class="text-sm font-semibold text-slate-900 dark:text-slate-50">目录</div>
          <div class="flex items-center gap-2">
            <button
              v-if="isMdUp"
              type="button"
              class="tw-btn-ghost px-2 py-1 text-xs"
              @click="
                () => {
                  collapsed = false;
                  overlayOpen = false;
                }
              ">
              展开到左侧
            </button>
            <button type="button" class="tw-btn-ghost px-2 py-1 text-xs" @click="overlayOpen = false">关闭</button>
          </div>
        </div>

        <div class="max-h-[60vh] overflow-auto p-2 tw-scrollbar">
          <ul class="space-y-1">
            <li v-for="it in items" :key="it.id">
              <div class="group flex items-center gap-2">
                <button
                  type="button"
                  class="flex-1 text-left rounded-lg px-2 py-2 text-sm transition"
                  :class="[
                    it.depth === 3 ? 'pl-6 text-slate-600 dark:text-slate-300' : 'pl-2 text-slate-800 dark:text-slate-200',
                    activeId === it.id
                      ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/60',
                  ]"
                  @click="scrollTo(it.id)">
                  {{ it.text }}
                </button>
                <button
                  type="button"
                  class="shrink-0 rounded-lg px-2 py-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-slate-50"
                  @click.stop="copyAnchor(it.id)">
                  {{ copiedId === it.id ? '已复制' : '复制' }}
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
