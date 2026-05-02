import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'
import AvatarSelector, { Avatar } from '../components/AvatarSelector'

export default function AvatarPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const [avatarId, setAvatarId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user) {
      supabase.from('users').select('avatar_url').eq('id', user.id).single()
        .then(({ data }) => {
          if (data?.avatar_url) setAvatarId(data.avatar_url)
        })
    }
  }, [user])

  async function handleAvatarSelect(newId) {
    setAvatarId(newId)
    setSaving(true)
    setSaved(false)
    
    const { error } = await supabase.from('users')
      .update({ avatar_url: newId })
      .eq('id', user.id)
    
    if (!error) {
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  return (
    <AppShell>
      <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/perfil')} style={{ padding: '0.5rem' }}>
              ←
            </button>
            <h2 className="home-section-title" style={{ margin: 0 }}>{t('profile.avatar_selection_title')}</h2>
          </div>
          
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: saved ? 'var(--primary)' : 'var(--text-muted)', transition: 'all 0.3s' }}>
            {saving ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="spinner-xs" /> {t('predictions.saving_changes')}
              </span>
            ) : saved ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ✓ {t('profile.saved')}
              </span>
            ) : null}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', padding: '2rem' }}>
          <div style={{ position: 'relative' }}>
            <Avatar id={avatarId} size="xl" />
            <div style={{ 
              position: 'absolute', 
              bottom: '-5px', 
              right: '-5px', 
              background: 'var(--primary)', 
              borderRadius: '50%', 
              width: '32px', 
              height: '32px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              border: '2px solid var(--card-bg)'
            }}>
              ✨
            </div>
          </div>

          <div style={{ width: '100%' }}>
            <AvatarSelector selectedId={avatarId} onSelect={handleAvatarSelect} />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
