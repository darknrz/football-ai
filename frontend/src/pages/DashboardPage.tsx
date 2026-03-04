import React, { useMemo, useState } from 'react'
import { useMatches } from '../hooks/useMatches'
import { Header } from '../components/Header'
import { MatchCard } from '../components/MatchCard'
import { MatchCardSkeleton } from '../components/MatchCardSkeleton'
import { LeagueFilter } from '../components/LeagueFilter'
import { SummaryBar } from '../components/SummaryBar'

// Fetch team names from backend (we get IDs, need to resolve names)
// Since names come embedded via the team relations or we just label them here
// For now, we build a quick lookup from match data
function buildTeamNames(matches: ReturnType<typeof useMatches>['matches']): Record<number, string> {
  // This is populated when backend includes team names in the response.
  // If not available, return empty and cards will show "Equipo #ID"
  return {}
}

export function DashboardPage() {
  const { matches, loading, syncing, error, reload, sync } = useMatches()
  const [leagueFilter, setLeagueFilter] = useState<number | null>(null)

  const teamNames = useMemo(() => buildTeamNames(matches), [matches])

  // Extract unique leagues
  const leagues = useMemo(() => {
    const seen = new Map<number, { id: number; name: string; country: string }>()
    for (const m of matches) {
      const l = m.season?.league
      if (l && !seen.has(l.id)) seen.set(l.id, l)
    }
    return Array.from(seen.values())
  }, [matches])

  const matchCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    for (const m of matches) {
      const lid = m.season?.league?.id
      if (lid) counts[lid] = (counts[lid] ?? 0) + 1
    }
    return counts
  }, [matches])

  const filtered = useMemo(() => {
    if (leagueFilter === null) return matches
    return matches.filter(m => m.season?.league?.id === leagueFilter)
  }, [matches, leagueFilter])

  // Sort: live first, then upcoming by time, then finished
  const sorted = useMemo(() => {
    const order = (status: string) => {
      if (status === '1H' || status === '2H' || status === 'HT') return 0
      if (status === 'NS') return 1
      if (status === 'FT') return 2
      return 3
    }
    return [...filtered].sort((a, b) => {
      const od = order(a.status) - order(b.status)
      if (od !== 0) return od
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })
  }, [filtered])

  return (
    <div style={styles.page}>
      <Header matchCount={matches.length} syncing={syncing} onSync={sync} />

      <main style={styles.main}>
        {/* Error banner */}
        {error && (
          <div style={styles.errorBanner}>
            ⚠️ {error}
            <button onClick={reload} style={styles.retryBtn}>Reintentar</button>
          </div>
        )}

        {/* Summary */}
        {!loading && matches.length > 0 && (
          <div className="fade-up">
            <SummaryBar matches={matches} />
          </div>
        )}

        {/* League filter */}
        {!loading && leagues.length > 1 && (
          <div className="fade-up fade-up-delay-1">
            <LeagueFilter
              leagues={leagues}
              selected={leagueFilter}
              onChange={setLeagueFilter}
              matchCounts={matchCounts}
            />
          </div>
        )}

        {/* Grid */}
        <div style={styles.grid}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <MatchCardSkeleton key={i} />)
          ) : sorted.length === 0 ? (
            <EmptyState onSync={sync} syncing={syncing} />
          ) : (
            sorted.map((match, i) => (
              <MatchCard
                key={match.id}
                match={match}
                index={i}
                teamNames={teamNames}
              />
            ))
          )}
        </div>
      </main>

      <footer style={styles.footer}>
        <p>FootballAI · Predicciones generadas con XGBoost</p>
      </footer>
    </div>
  )
}

function EmptyState({ onSync, syncing }: { onSync: () => void; syncing: boolean }) {
  return (
    <div style={empty.wrapper} className="fade-up">
      <div style={empty.icon}>⚽</div>
      <h2 style={empty.title}>Sin partidos para hoy</h2>
      <p style={empty.sub}>Sincroniza con la API para obtener los partidos del día</p>
      <button
        onClick={onSync}
        disabled={syncing}
        style={{ ...empty.btn, opacity: syncing ? 0.6 : 1 }}
      >
        {syncing ? 'Sincronizando…' : '↻ Sincronizar ahora'}
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg)',
  },
  main: {
    flex: 1,
    maxWidth: 1280,
    width: '100%',
    margin: '0 auto',
    padding: '24px 32px 48px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: 16,
    marginTop: 4,
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 18px',
    background: '#fef2f2',
    border: '1.5px solid #fecaca',
    borderRadius: 12,
    fontSize: '0.82rem',
    color: '#991b1b',
    fontWeight: 500,
  },
  retryBtn: {
    padding: '5px 12px',
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  },
  footer: {
    textAlign: 'center',
    padding: '20px 32px',
    fontSize: '0.72rem',
    color: '#9ca3af',
    borderTop: '1px solid #e5e7eb',
    letterSpacing: '0.04em',
  },
}

const empty: Record<string, React.CSSProperties> = {
  wrapper: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    gap: 12,
    textAlign: 'center',
  },
  icon: {
    fontSize: '3.5rem',
    lineHeight: 1,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.8rem',
    color: '#0d0d0d',
  },
  sub: {
    fontSize: '0.9rem',
    color: '#6b7280',
    maxWidth: 360,
  },
  btn: {
    marginTop: 8,
    padding: '12px 28px',
    background: '#0d0d0d',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: '0.85rem',
    fontWeight: 700,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
  },
}