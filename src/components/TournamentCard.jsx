import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function TournamentCard({ tournament, onDeleteSuccess }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [predStats, setPredStats] = useState(null) // { submitted, total }
  const [featured, setFeatured] = useState(tournament.is_featured || false)

  const isAdmin = tournament.role === 'admin'
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

  const handleCopyCode = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(tournament.invite_code ?? '')
    // Potentially add a small toast here
    setShowMenu(false)
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    setDeleting(true)
    try {
      const { error } = await supabase.from('tournaments').delete().eq('id', tournament.id)
      if (error) throw error
      if (onDeleteSuccess) onDeleteSuccess(tournament.id)
    } catch (err) {
      console.error('Error deleting tournament:', err)
      alert(t('common.error_generic'))
    } finally {
      setDeleting(false)
      setShowConfirm(false)
    }
  }

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
      
      {/* Clickable Area: Tournament Info */}
      <div 
        style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
        onClick={() => navigate(`/torneo/${tournament.id}`)}
      >
        <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tournament.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', minWidth: 0 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1 }}>
            {tournament.competitions?.name}
          </p>
          {tournament.mode && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', opacity: 0.8, whiteSpace: 'nowrap', flexShrink: 0 }}>
              • {t(`modes.${tournament.mode}_full`)}
            </span>
          )}
        </div>
        {tournament.prize && (
          <p style={{
            fontSize: '0.75rem', marginTop: '0.15rem',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: '100%'
          }}>
            <span style={{ marginRight: '0.25rem' }}>🏅</span>
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
                <span style={{ fontSize: '0.7rem' }}>✅</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Visible Action Icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
        
        {/* Featured Toggle (App Admin Only) */}
        {isAppAdmin && (
          <button 
            className={`btn-icon-action ${featured ? 'featured-active' : ''}`}
            title={featured ? t('tournaments.featured_remove') : t('tournaments.featured_add')}
            onClick={handleToggleFeatured}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={featured ? "var(--warning)" : "none"} stroke={featured ? "var(--warning)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
        )}

        {/* Cargar Pronósticos */}
        <button 
          className="btn-icon-action" 
          title={t('predictions.go_predict')} 
          onClick={(e) => { e.stopPropagation(); navigate(`/torneo/${tournament.id}/pronosticos`); }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>

        {/* Copiar Código */}
        {tournament.invite_code && (
          <button 
            className="btn-icon-action" 
            title={t('actions.copy_code')} 
            onClick={handleCopyCode}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        )}

        {/* Ajustes and More Menu - Only for Admins/Owners */}
        {isAdmin && (
          <>
            {/* Ajustes (Settings/Details) */}
            <button 
              className="btn-icon-action" 
              title={t('actions.settings')} 
              onClick={(e) => { e.stopPropagation(); navigate(`/torneo/${tournament.id}`); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>

            {/* More Actions Toggle (Vertical Dots) */}
            <div style={{ position: 'relative' }}>
              <button 
                className="btn-icon-action" 
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
                </svg>
              </button>

              {/* Simple Dropdown for Delete */}
              {showMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} onClick={() => setShowMenu(false)} />
                  <div style={{ 
                    position: 'absolute', right: 0, top: '100%', marginTop: '4px', zIndex: 1001,
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                    boxShadow: 'var(--shadow-lg)', overflow: 'hidden', minWidth: '120px'
                  }}>
                    <button 
                      className="dropdown-item text-danger" 
                      onClick={(e) => { e.stopPropagation(); setShowConfirm(true); setShowMenu(false); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
                        <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                      {t('actions.delete')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showConfirm && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, backdropFilter: 'blur(4px)' }} />
          <div style={{ 
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 1101, width: '90%', maxWidth: '360px', borderRadius: 'var(--r-lg)',
            background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)',
            padding: '1.5rem', textAlign: 'center'
          }}>
            <h4 style={{ color: 'var(--text)', marginBottom: '1rem', fontWeight: 800 }}>{t('actions.delete')}</h4>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>{t('actions.delete_confirm')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
              >
                {t('actions.cancel')}
              </button>
              <button 
                className="btn btn-primary btn-sm" 
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? '…' : t('actions.delete')}
              </button>
            </div>
          </div>
        </>
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
        .dropdown-item {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 0.625rem 1rem;
          text-align: left;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-2);
          transition: background var(--t-fast);
        }
        .dropdown-item:hover { background: var(--surface-2); color: var(--text); }
        .dropdown-item.text-danger { color: var(--danger); }
        .dropdown-item.text-danger:hover { background: var(--danger-subtle); }
      `}</style>
    </div>
  )
}
