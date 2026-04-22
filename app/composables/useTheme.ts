import { useState } from '#app'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'nb-theme'

function normalizeTheme(value: unknown): ThemeMode | null {
  if (value === 'light' || value === 'dark') return value
  return null
}

function getSystemTheme(): ThemeMode {
  if (!import.meta.client) return 'light'
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function applyThemeToDom(theme: ThemeMode) {
  if (!import.meta.client) return
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

function readPersistedTheme(): ThemeMode | null {
  if (!import.meta.client) return null
  try {
    return normalizeTheme(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

function writePersistedTheme(theme: ThemeMode) {
  if (!import.meta.client) return
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {}
}

export function useTheme() {
  const theme = useState<ThemeMode>('theme', () => 'light')

  function setTheme(next: ThemeMode, opts?: { persist?: boolean }) {
    theme.value = next
    applyThemeToDom(next)
    if (opts?.persist) writePersistedTheme(next)
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark', { persist: true })
  }

  function initTheme() {
    if (!import.meta.client) return
    const persisted = readPersistedTheme()
    setTheme(persisted ?? getSystemTheme(), { persist: false })
  }

  return { theme, setTheme, toggleTheme, initTheme }
}
