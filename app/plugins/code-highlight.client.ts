import hljs from 'highlight.js/lib/common'

export default defineNuxtPlugin((nuxtApp) => {
  function highlightAll() {
    if (!import.meta.client) return
    const nodes = document.querySelectorAll<HTMLElement>('pre code')
    for (const el of nodes) {
      if (el.classList.contains('hljs')) continue
      try {
        hljs.highlightElement(el)
      } catch {}
    }
  }

  nuxtApp.hook('page:finish', () => {
    requestAnimationFrame(() => highlightAll())
    window.setTimeout(() => highlightAll(), 150)
  })
})

