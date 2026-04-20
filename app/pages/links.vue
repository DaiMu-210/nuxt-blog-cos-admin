<script setup lang="ts">
const { data: links } = await useAsyncData('links', () => queryCollection('links').first())
</script>

<template>
  <section>
    <h1 class="text-2xl font-bold text-slate-900">友链</h1>

    <div v-if="links?.groups?.length" class="mt-4 space-y-6">
      <section v-for="g in links.groups" :key="g.name">
        <h2 class="mb-3 text-base font-semibold text-slate-900">{{ g.name }}</h2>
        <ul class="space-y-3">
          <li v-for="item in g.items" :key="item.url" class="flex gap-3 rounded-xl border border-slate-100 bg-white p-3">
            <img
              v-if="item.avatar"
              class="h-10 w-10 rounded-full border border-slate-200 object-cover"
              :src="item.avatar"
              alt="avatar"
            />
            <div class="min-w-0">
              <a class="font-semibold text-slate-900 no-underline hover:underline" :href="item.url" target="_blank" rel="noreferrer">
                {{ item.title }}
              </a>
              <div v-if="item.desc" class="mt-1 text-slate-700">{{ item.desc }}</div>
              <div class="mt-1 text-xs text-slate-500">{{ item.url }}</div>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <p v-else class="mt-3 text-slate-500">还没有友链。你可以在控制台里添加。</p>
  </section>
</template>
