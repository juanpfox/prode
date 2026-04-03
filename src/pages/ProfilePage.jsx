import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [myTournaments, setMyTournaments] = useState([])

  useEffect(() => {
    supabase.from('users').select('*').eq('id', user.id).single()
      .then(({ data }) => {
        setProfile(data)
        setDisplayName(data?.display_name ?? '')
      })
    supabase.from('tournament_players')
      .select('role, status, tournaments(id, name, competitions(name))')
      .eq('user_id', user.id)
      .then(({ data }) => setMyTournaments(data ?? []))
  }, [user])

  async function handleSave(e) {
    e.preventDefault()
    if (!displayName.trim()) return
    setSaving(true)
    await supabase.from('users').update({ display_name: displayName.trim() }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const approved = myTournaments.filter(tp => tp.status === 'approved')
  const pending  = myTournaments.filter(tp => tp.status === 'pending')

  return (
    <AppShell>
      <div className="animate-fade-in">
        <h2 className="home-section-title" style={{ marginBottom: '1.25rem' }}>{t('nav.profile')}</h2>

        <div className="card card-sm" style={{ marginBottom: '1.25rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>Email</p>
          <p style={{ fontWeight: 600, wordBreak: 'break-all' }}>{user.email}</p>
        </div>

        <div className="card card-sm" style={{ marginBottom: '1.25rem' }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('profile.display_name')}</label>
            <input className="input" value={displayName} maxLength={32}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={t('profile.display_name_placeholder')} />
            <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
              {saved ? `✓ ${t('profile.saved')}` : saving ? t('common.loading') : t('profile.save')}
            </button>
          </form>
        </div>

        {profile && (
          <div className="card card-sm" style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.875rem' }}>{t('profile.stats')}</p>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{approved.length}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('profile.stat_active_tournaments')}</p>
              </div>
              <div>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{profile.tournaments_created ?? 0}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('profile.stat_created')}</p>
              </div>
              {pending.length > 0 && (
                <div>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>{pending.length}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('profile.stat_pending')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: '0.5rem', color: 'var(--text-muted)' }}
          onClick={signOut}>
          🚪 {t('common.sign_out')}
        </button>
      </div>
    </AppShell>
  )
}
