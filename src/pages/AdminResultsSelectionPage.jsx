import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AppShell from '../components/AppShell'

export default function AdminResultsSelectionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [competitions, setCompetitions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCompetitions() {
      const { data } = await supabase
        .from('competitions')
        .select('*')
        .order('created_at', { ascending: false })
      setCompetitions(data || [])
      setLoading(false)
    }
    loadCompetitions()
  }, [])

  if (loading) return (
    <AppShell>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>{t('common.loading')}</p>
    </AppShell>
  )

  return (
    <AppShell>
      <div className="animate-fade-in">
        <h2 className="home-section-title" style={{ marginBottom: '1.5rem' }}>
          {t('admin.load_results_title', { defaultValue: 'Carga de Resultados Reales' })}
        </h2>
        
        <div className="admin-results-grid">
          {competitions.map(comp => (
            <div 
              key={comp.id} 
              className="admin-comp-card"
              onClick={() => navigate(`/admin/resultados/${comp.id}`)}
            >
              <span>{comp.name}</span>
            </div>
          ))}
        </div>

        {competitions.length === 0 && (
          <div className="home-empty card card-sm">
            <span style={{ fontSize: '2rem' }}>📅</span>
            <p style={{ color: 'var(--text-muted)' }}>
              {t('common.no_data', { defaultValue: 'No hay torneos disponibles' })}
            </p>
          </div>
        )}
      </div>

      <style>{`
        .admin-results-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          max-width: 800px;
          margin: 0 auto;
        }
        
        @media (min-width: 640px) {
          .admin-results-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .admin-comp-card {
          aspect-ratio: 16 / 10;
          background: #135d7a; /* Dark teal from image */
          border-radius: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2), inset 0 0 0 4px rgba(0,0,0,0.1);
          text-align: center;
          padding: 2rem;
        }

        .admin-comp-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          background: #176f91;
        }

        .admin-comp-card:active {
          transform: translateY(0);
        }
      `}</style>
    </AppShell>
  )
}
