import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import ThemeToggle from '../components/ThemeToggle'
import LangSelector from '../components/LangSelector'
import './LoginPage.css'

export default function LoginPage() {
  const { t } = useTranslation()
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')
    const { error } = await signInWithEmail(email)
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="login-page pitch-bg">
      {/* Top bar */}
      <div className="login-topbar">
        <ThemeToggle />
        <LangSelector />
      </div>

      <div className="login-center">
        {/* Hero */}
        <div className="login-hero animate-fade-in">
          <div className="login-ball">⚽</div>
          <h1 className="login-title">{t('auth.title')}</h1>
          <p className="login-subtitle">{t('auth.subtitle')}</p>

          {/* Competition badge */}
          <div className="login-badges">
            <span className="badge badge-green">🏆 World Cup 2026</span>
          </div>
        </div>

        {/* Card */}
        <div className="login-card card animate-slide-up">
          {status === 'sent' ? (
            <div className="login-sent">
              <div className="login-sent-icon">📬</div>
              <h2>{t('auth.check_email')}</h2>
              <p>{t('auth.check_email_sub', { email })}</p>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setStatus('idle'); setEmail('') }}
              >
                ← {t('auth.back')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" htmlFor="email">
                  {t('auth.email_label')}
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder={t('auth.email_placeholder')}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  disabled={status === 'sending'}
                />
              </div>

              {status === 'error' && (
                <p className="form-error" style={{ marginBottom: '0.75rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  {errorMsg || t('common.error_generic')}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-full"
                disabled={status === 'sending' || !email}
              >
                {status === 'sending' ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    {t('auth.sending')}
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    {t('auth.sign_in')}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
