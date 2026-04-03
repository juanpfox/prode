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

  useEffect(() => {
    supabase
      .from('users')
      .select('display_name, avatar_url, tournaments_created')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data)
        setDisplayName(data?.display_name ?? '')
      })
  }, [user])

  async function handleSave(e) {
    e.preventDefault()
    if (!displayName.trim()) return
    setSaving(true)
    await supabase
      .from('users')
      .update({ display_name: displayName.trim() })
      .eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <AppShell>
      <div className="animate-fade-in">
        <h2 className="home-section-title" style={{ marginBottom: '1.25rem' }}>{t('nav.profile')}</h2>

        <div className="card card-sm" style={{ marginBottom: '1.25rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Email</p>
          <p style={{ fontWeight: 600 }}>{user.email}</p>
        </div>

        <div className="card card-sm" style={{ marginBottom: '1.25rem' }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('profile.display_name')}</label>
            <input
              className="input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={t('profile.display_name_placeholder')}
              maxLength={32}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
              {saved ? '✓ ' + t('profile.saved') : saving ? t('common.loading') : t('profile.save')}
            </button>
          </form>
        </div>

        {profile && (
          <div className="card card-sm" style={{ marginBottom: '1.25rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{t('profile.stats')}</p>
            <p style={{ fontWeight: 600 }}>{t('tournaments.create')}: {profile.tournaments_created ?? 0}</p>
          </div>
        )}

        <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: '0.5rem' }} onClick={signOut}>
          🚪 {t('common.sign_out')}
        </button>
      </div>
    </AppShell>
  )
}
