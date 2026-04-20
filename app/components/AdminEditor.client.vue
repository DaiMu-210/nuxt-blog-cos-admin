<script setup lang="ts">
import type Editor from '@toast-ui/editor'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
}>()

const el = ref<HTMLDivElement | null>(null)
let editor: Editor | null = null
let lastFromEditor = ''

onMounted(async () => {
  const { default: ToastEditor } = await import('@toast-ui/editor')
  if (!el.value) return

  editor = new ToastEditor({
    el: el.value,
    height: '100%',
    initialEditType: 'wysiwyg',
    previewStyle: 'vertical',
    usageStatistics: false,
    hideModeSwitch: true,
    initialValue: props.modelValue || ''
  })

  lastFromEditor = editor.getMarkdown()

  editor.on('change', () => {
    if (!editor) return
    const md = editor.getMarkdown()
    lastFromEditor = md
    emit('update:modelValue', md)
  })
})

watch(
  () => props.modelValue,
  (v) => {
    if (!editor) return
    const current = editor.getMarkdown()
    // 避免循环更新
    if (v === current || v === lastFromEditor) return
    editor.setMarkdown(v || '', false)
  }
)

onBeforeUnmount(() => {
  editor?.destroy()
  editor = null
})
</script>

<template>
  <div ref="el" />
</template>
