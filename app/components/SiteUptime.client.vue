<script setup lang="ts">
const props = defineProps<{
  since: string
}>()

function parseSince(input: string) {
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return null
  return d
}

const sinceDate = computed(() => parseSince(props.since))
const now = ref(Date.now())

let timer: any
onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 60_000)
})

onBeforeUnmount(() => {
  clearInterval(timer)
})

const text = computed(() => {
  if (!sinceDate.value) return ''
  const diff = Math.max(0, now.value - sinceDate.value.getTime())
  const hoursTotal = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hoursTotal / 24)
  const hours = hoursTotal % 24
  return `建站至今已运行 ${days} 天 ${hours} 小时`
})
</script>

<template>
  <span v-if="text">{{ text }}</span>
</template>

