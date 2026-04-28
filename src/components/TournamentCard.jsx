import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from './AvatarSelector'

export default function TournamentCard({ tournament, onDeleteSuccess }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [predStats, setPredStats] = useState(null) // { submitted, total }
  const [featured, setFeatured] = useState(tournament.is_featured || false)

  const isAppAdmin = profile?.is_admin || user?.email === 'guest@prodemundial.dev' || user?.email === 'juanpatriciofox@gmail.com'

  useEffect(() => {
    if (!user || !tournament.id || !tournament.competition_id) return

    async function fetchPredStats() {
      if (tournament.mode === 'partidos') {
        const [{ count: submitted }, { count: total }] = await Promise.all([
          supabase
            .from('match_predictions')
            .select('id', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id)
            .eq('user_id', user.id),
          supabase
            .from('matches')
            .select('id', { count: 'exact', head: true })
            .eq('competition_id', tournament.competition_id),
        ])
        setPredStats({ submitted: submitted ?? 0, total: total ?? 0 })
      } else if (tournament.mode === 'posiciones') {
        const [{ count: submitted }, { count: total }] = await Promise.all([
          supabase
            .from('fixture_predictions')
            .select('id', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id)
            .eq('user_id', user.id),
          supabase
            .from('teams')
            .select('id', { count: 'exact', head: true })
            .eq('competition_id', tournament.competition_id),
        ])
        setPredStats({ submitted: submitted ?? 0, total: total ?? 0 })
      }
    }

    fetchPredStats()
  }, [user, tournament.id, tournament.competition_id, tournament.mode])

  const handleToggleFeatured = async (e) => {
    e.stopPropagation()
    const newValue = !featured
    setFeatured(newValue)
    try {
      const { error } = await supabase.from('tournaments').update({ is_featured: newValue }).eq('id', tournament.id)
      if (error) throw error
    } catch (err) {
      console.error('Error toggling featured:', err)
      setFeatured(!newValue)
      alert(t('common.error_generic'))
    }
  }

  return (
    <div className="card card-sm animate-fade-in" 
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1rem', paddingRight: '0.75rem' }}>
      
      <Avatar id={tournament.avatar_url} size="md" placeholder="\u{1F3C6}" />

      {/* Clickable Area: Tournament Info */}
      <div 
        style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
        onClick={() => navigate(`/${tournament.slug || tournament.id}`)}
      >
        <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tournament.name}
        </p>

        {tournament.prize && (
          <p style={{
            fontSize: '0.75rem', marginTop: '0.15rem',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: '100%'
          }}>
            <span style={{ marginRight: '0.25rem' }}>\u{1F3C5}</span>
            {tournament.prize}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
          {tournament.creator_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-subtle)', fontSize: '0.75rem' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <span>{tournament.creator_name}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-subtle)', fontSize: '0.75rem' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>{t('tournaments.players', { count: tournament.participants_count })}</span>
          </div>
          {predStats && (
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem',
              color: predStats.submitted < predStats.total ? 'var(--danger)' : '#10b981',
              fontWeight: 600
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              <span>{predStats.submitted}/{predStats.total}</span>
              {predStats.submitted === predStats.total && (
                <span style={{ fontSize: '0.7rem' }}>\u2705</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Featured Toggle (App Admin Only) */}
      {isAppAdmin && (
        <div style={{ flexShrink: 0 }}>
          <button 
            className={`btn-icon-action ${featured ? 'featured-active' : ''}`}
            title={featured ? t('tournaments.featured_remove') : t('tournaments.featured_add')}
            onClick={handleToggleFeatured}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={featured ? "var(--warning)" : "none"} stroke={featured ? "var(--warning)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
        </div>
      )}

      {/* Local Styles */}
      <style>{`
        .btn-icon-action {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--r-md);
          color: var(--text-muted);
          transition: all var(--t-fast);
        }
        .btn-icon-action:hover {
          background: var(--surface-2);
          color: var(--primary);
          transform: translateY(-1px);
        }
        .btn-icon-action.featured-active {
          color: var(--warning);
        }
        .btn-icon-action.featured-active:hover {
          background: rgba(251, 191, 36, 0.1);
        }
      `}</style>
    </div>
  )
}
