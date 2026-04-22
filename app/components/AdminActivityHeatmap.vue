<script setup lang="ts">
type PostListItem = {
  slug: string;
  date?: string;
  updatedAt?: string;
};

const props = defineProps<{
  posts: PostListItem[];
  days?: number;
}>();

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function parseYmd(input: string | undefined) {
  if (!input) return null;
  const s = String(input).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

const rangeDays = computed(() => Math.max(7, Number(props.days ?? 365)));

const counts = computed(() => {
  const map: Record<string, number> = {};
  for (const p of props.posts || []) {
    const ymd = parseYmd(p.date) || parseYmd(p.updatedAt);
    if (!ymd) continue;
    map[ymd] = (map[ymd] || 0) + 1;
  }
  return map;
});

const cells = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (rangeDays.value - 1));

  const pad = start.getDay();
  const list: Array<{ date: string; count: number } | null> = [];
  for (let i = 0; i < pad; i++) list.push(null);

  for (let i = 0; i < rangeDays.value; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = toYmd(d);
    list.push({ date: key, count: counts.value[key] || 0 });
  }

  const weeks: Array<Array<{ date: string; count: number } | null>> = [];
  for (let i = 0; i < list.length; i += 7) weeks.push(list.slice(i, i + 7));
  return weeks;
});

const maxCount = computed(() => {
  let max = 0;
  for (const w of cells.value) {
    for (const c of w) {
      if (!c) continue;
      if (c.count > max) max = c.count;
    }
  }
  return max;
});

function level(count: number) {
  if (count <= 0) return 0;
  const max = maxCount.value || 1;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4)));
}

function levelClass(lv: number) {
  if (lv === 0) return 'bg-slate-100';
  if (lv === 1) return 'bg-emerald-100';
  if (lv === 2) return 'bg-emerald-200';
  if (lv === 3) return 'bg-emerald-300';
  return 'bg-emerald-400';
}
</script>

<template>
  <div class="overflow-x-auto tw-scrollbar">
    <div class="inline-grid grid-flow-col auto-cols-max gap-2">
      <div v-for="(week, wi) in cells" :key="wi" class="grid grid-rows-7 gap-1">
        <div
          v-for="(c, di) in week"
          :key="di"
          class="h-3 w-3 rounded-sm"
          :class="c ? levelClass(level(c.count)) : 'bg-transparent'"
          :title="c ? `${c.date}：${c.count} 篇` : ''" />
      </div>
    </div>
  </div>

  <div class="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
    <div>最近 {{ rangeDays }} 天（按 date 统计）</div>
    <div class="flex items-center gap-2">
      <span>少</span>
      <span class="h-3 w-3 rounded-sm bg-slate-100" />
      <span class="h-3 w-3 rounded-sm bg-emerald-100" />
      <span class="h-3 w-3 rounded-sm bg-emerald-200" />
      <span class="h-3 w-3 rounded-sm bg-emerald-300" />
      <span class="h-3 w-3 rounded-sm bg-emerald-400" />
      <span>多</span>
    </div>
  </div>
</template>
