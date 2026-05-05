import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { Avatar } from '../components/AvatarSelector'

export default function ProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, refreshProfile, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarId, setAvatarId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('users').select('*').eq('id', user.id).single()
      .then(({ data }) => {
        setProfile(data)
        setDisplayName(data?.display_name ?? '')
        setAvatarId(data?.avatar_url ?? '')
      })
  }, [user])

  async function handleSave(e) {
    e.preventDefault()
    if (!displayName.trim()) return
    setSaving(true)
    await supabase.from('users')
      .update({ 
        display_name: displayName.trim(),
        avatar_url: avatarId
      })
      .eq('id', user.id)
    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }


  return (
    <AppShell>
      <div className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            ← {t('common.back')}
          </button>
          <h2 className="home-section-title" style={{ margin: 0 }}>{t('nav.profile')}</h2>
        </div>

        <div className="card card-sm" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <Link to="/perfil/avatar" style={{ textDecoration: 'none', transition: 'transform 0.2s' }} className="avatar-link">
              <Avatar id={avatarId} size="lg" />
            </Link>
            <Link to="/perfil/avatar" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              {t('profile.change_avatar')}
            </Link>
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>Email</p>
            <p style={{ fontWeight: 600, wordBreak: 'break-all' }}>{user.email}</p>
          </div>
        </div>

        <div className="card card-sm" style={{ marginBottom: '1.25rem' }}>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('profile.display_name')}</label>
            <input className="input" value={displayName} maxLength={32}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={t('profile.display_name_placeholder')} />

            <button className="btn btn-primary btn-sm" type="submit" disabled={saving} style={{ marginTop: '0.5rem' }}>
              {saved ? `✓ ${t('profile.saved')}` : saving ? t('common.loading') : t('profile.save')}
            </button>
          </form>
        </div>


        <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: '0.5rem', color: 'var(--text-muted)' }}
          onClick={signOut}>
          🚪 {t('common.sign_out')}
        </button>
      </div>
    </AppShell>
  )
}
