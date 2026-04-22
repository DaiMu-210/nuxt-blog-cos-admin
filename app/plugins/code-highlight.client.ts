import hljs from 'highlight.js/lib/common'
import { useToast } from '~/composables/useToast'
import { enhanceCodeBlocks } from '~/utils/code-block'

export default defineNuxtPlugin((nuxtApp) => {
  const toast = useToast()

  function isHighlighted(el: HTMLElement) {
    const v = (el as any)?.dataset?.highlighted || el.getAttribute('data-highlighted')
    return v === 'yes' || v === 'true' || v === '1'
  }

  function highlightAll() {
    if (!import.meta.client) return
    const nodes = document.querySelectorAll<HTMLElement>('pre code')
    for (const el of nodes) {
      if (isHighlighted(el)) continue
      try {
        hljs.highlightElement(el)
      } catch {}
    }
    enhanceCodeBlocks(document, { toast })
  }

  function schedule() {
    requestAnimationFrame(() => highlightAll())
    window.setTimeout(() => highlightAll(), 150)
    window.setTimeout(() => highlightAll(), 700)
  }

  nuxtApp.hook('app:mounted', () => schedule())
  nuxtApp.hook('page:finish', () => schedule())
})
