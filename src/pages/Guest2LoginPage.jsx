import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Guest2LoginPage() {
  const { signInAsGuest2, user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('Iniciando sesión como guest2…')

  useEffect(() => {
    // If already logged in, just go home
    if (user) {
      navigate('/', { replace: true })
      return
    }

    signInAsGuest2().then(({ error }) => {
      if (error) {
        setStatus(`❌ Error: ${error.message}`)
      } else {
        setStatus('✅ Sesión iniciada. Redirigiendo…')
        navigate('/', { replace: true })
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <span style={{ fontSize: '2.5rem', animation: 'bounce-soft 1.5s ease-in-out infinite' }}>⚽</span>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>{status}</p>
    </div>
  )
}
