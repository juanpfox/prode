import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { applyRTL } from '../hooks/useTheme'

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
]

export default function LangSelector() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const current = LANGUAGES.find(l => i18n.language?.startsWith(l.code)) ?? LANGUAGES[2]

  const select = (code) => {
    i18n.changeLanguage(code)
    applyRTL(code)
    setOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn btn-icon"
        onClick={() => setOpen(o => !o)}
        aria-label="Select language"
        aria-expanded={open}
        style={{ fontSize: '1.125rem', padding: '0.375rem 0.5rem', borderRadius: 'var(--r-md)' }}
      >
        <span>🌐</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          zIndex: 200,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-xl)',
          padding: '0.375rem',
          minWidth: '180px',
          animation: 'fade-in 0.15s ease both',
        }}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => select(lang.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--r-md)',
                fontSize: '0.9rem',
                fontWeight: lang.code === current.code ? 600 : 400,
                color: lang.code === current.code ? 'var(--primary)' : 'var(--text)',
                background: lang.code === current.code ? 'var(--primary-subtle)' : 'transparent',
                transition: 'background var(--t-fast)',
              }}
              onMouseEnter={e => { if (lang.code !== current.code) e.currentTarget.style.background = 'var(--surface-2)' }}
              onMouseLeave={e => { if (lang.code !== current.code) e.currentTarget.style.background = 'transparent' }}
            >
              <span>{lang.label}</span>
              {lang.code === current.code && (
                <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
