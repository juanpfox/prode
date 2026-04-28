import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import ThemeToggle from '../components/ThemeToggle'
import LangSelector from '../components/LangSelector'
import prodeImage from '../assets/prodeImage.png'
import './LoginPage.css'

export default function LoginPage() {
  const { t } = useTranslation()
  const { signInWithEmail, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('')
  const [emailError, setEmailError] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      setEmailError(true)
      return
    }
    setEmailError(false)
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

  const handleGoogleLogin = async () => {
    setStatus('sending')
    setErrorMsg('')
    const { error } = await signInWithGoogle()
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
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
          <img src={prodeImage} alt="Prode Mundial" className="login-hero-image" />
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
            <>
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  {emailError && (
                    <p className="form-error" style={{ marginBottom: '0.5rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                      {t('auth.email_required')}
                    </p>
                  )}
                  <label className="form-label" htmlFor="email">
                    {t('auth.email_label')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    style={emailError ? { borderColor: 'var(--error, #ef4444)', boxShadow: '0 0 0 2px rgba(239,68,68,0.2)' } : undefined}
                    placeholder={t('auth.email_placeholder')}
                    value={email}
                    onChange={e => { setEmail(e.target.value); if (emailError) setEmailError(false) }}
                    autoComplete="email"
                    autoFocus
                    disabled={status === 'sending'}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg btn-full"
                  disabled={status === 'sending'}
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

              <div className="login-divider">
                <span>{t('auth.or_continue_with')}</span>
              </div>

              <button
                className="btn btn-google btn-lg btn-full"
                onClick={handleGoogleLogin}
                disabled={status === 'sending'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {t('auth.sign_in_google')}
              </button>

              {status === 'error' && (
                <p className="form-error" style={{ marginTop: '0.75rem', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  {errorMsg || t('common.error_generic')}
                </p>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  )
}
