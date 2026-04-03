import { useState, useEffect } from 'react'

const RTL_LANGS = ['ar']

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return { theme, toggle, isDark: theme === 'dark' }
}

export function applyRTL(lang) {
  const isRTL = RTL_LANGS.includes(lang)
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
}
