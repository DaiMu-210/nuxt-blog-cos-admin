<script setup lang="ts">
import type Editor from '@toast-ui/editor'
import { useTheme } from '~/composables/useTheme'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
}>()

const { theme } = useTheme()

const el = ref<HTMLDivElement | null>(null)
let editor: Editor | null = null
let ToastEditor: any | null = null
let lastFromEditor = ''

async function ensureEditorCtor() {
  if (ToastEditor) return
  const mod = await import('@toast-ui/editor')
  ToastEditor = mod.default
}

function destroyEditor() {
  editor?.destroy()
  editor = null
}

async function createEditor(initialValue: string) {
  await ensureEditorCtor()
  if (!el.value) return

  editor = new ToastEditor({
    el: el.value,
    height: '100%',
    initialEditType: 'wysiwyg',
    previewStyle: 'vertical',
    usageStatistics: false,
    hideModeSwitch: true,
    initialValue,
    ...(theme.value === 'dark' ? { theme: 'dark' } : {})
  })

  lastFromEditor = editor.getMarkdown()

  editor.on('change', () => {
    if (!editor) return
    const md = editor.getMarkdown()
    lastFromEditor = md
    emit('update:modelValue', md)
  })
}

onMounted(async () => {
  await createEditor(props.modelValue || '')
})

watch(
  () => theme.value,
  async (next, prev) => {
    if (!editor || !el.value) return
    if (next === prev) return
    const md = editor.getMarkdown()
    destroyEditor()
    await createEditor(md)
  }
)

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
  destroyEditor()
})
</script>

<template>
  <div ref="el" />
</template>
