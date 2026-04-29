export default defineNuxtPlugin(() => {
  const cfg = useRuntimeConfig()
  const pub: any = (cfg as any).public || {}

  const plausibleDomain = String(pub.plausibleDomain || '').trim()
  const plausibleSrc = String(pub.plausibleSrc || 'https://plausible.io/js/script.js').trim()

  const sentryDsn = String(pub.sentryDsn || '').trim()
  const sentrySrc = String(pub.sentrySrc || 'https://browser.sentry-cdn.com/7.120.1/bundle.tracing.min.js').trim()
  const sentryTracesSampleRate = Number(pub.sentryTracesSampleRate ?? 0)
  const sentryEnv = String(pub.sentryEnv || '').trim()
  const sentryRelease = String(pub.sentryRelease || '').trim()

  const scripts: any[] = []
  if (plausibleDomain) {
    scripts.push({ src: plausibleSrc, defer: true, 'data-domain': plausibleDomain })
  }
  if (sentryDsn) {
    scripts.push({ src: sentrySrc, crossorigin: 'anonymous' })
  }
  if (scripts.length) useHead({ script: scripts as any })

  if (sentryDsn) {
    onMounted(() => {
      const Sentry = (window as any)?.Sentry
      if (!Sentry?.init) return
      Sentry.init({
        dsn: sentryDsn,
        tracesSampleRate: Number.isFinite(sentryTracesSampleRate) ? sentryTracesSampleRate : 0,
        ...(sentryEnv ? { environment: sentryEnv } : {}),
        ...(sentryRelease ? { release: sentryRelease } : {}),
      })
    })
  }
})

