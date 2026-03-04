import React, { useState, useMemo } from 'react'
import { Search } from 'lucide-react' // O cualquier librería de iconos

interface League {
  id: number
  name: string
  country: string
  type: 'league' | 'cup' // Añadimos tipo para diferenciar Copa del Rey, etc.
}

interface LeagueFilterProps {
  leagues: League[]
  selected: number | null
  onChange: (id: number | null) => void
  matchCounts: Record<number, number>
}

export function LeagueFilter({ leagues, selected, onChange, matchCounts }: LeagueFilterProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // 1. Lógica de Filtrado y Categorización
  const filteredCategories = useMemo(() => {
    const cleanSearch = searchTerm.toLowerCase();
    const filtered = leagues.filter(l => 
      l.name.toLowerCase().includes(cleanSearch) || 
      l.country.toLowerCase().includes(cleanSearch)
    );

    return {
      top: filtered.filter(l => ['Inglaterra', 'España', 'Alemania', 'Italia', 'Francia'].includes(l.country) && l.type === 'league'),
      copas: filtered.filter(l => l.type === 'cup' || l.name.toLowerCase().includes('copa')),
      resto: filtered.filter(l => !['Inglaterra', 'España', 'Alemania', 'Italia', 'Francia'].includes(l.country) && l.type !== 'cup')
    };
  }, [leagues, searchTerm]);

  const totalMatches = Object.values(matchCounts).reduce((a, b) => a + b, 0);

  return (
    <div style={styles.sidebar}>
      {/* BUSCADOR */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Buscar liga o país..."
          style={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div style={styles.scrollArea}>
        {/* BOTÓN TODAS */}
        <button 
          onClick={() => onChange(null)}
          style={{...styles.item, ...(selected === null ? styles.activeItem : {})}}
        >
          <span>🌎 Todas las Ligas</span>
          <span style={styles.badge}>{totalMatches}</span>
        </button>

        {/* SECCIÓN: TOP LIGAS */}
        {filteredCategories.top.length > 0 && (
          <section>
            <h3 style={styles.sectionTitle}>Principales Ligas</h3>
            {filteredCategories.top.map(league => (
              <LeagueItem 
                key={league.id} 
                league={league} 
                isSelected={selected === league.id} 
                count={matchCounts[league.id]} 
                onClick={() => onChange(league.id)}
              />
            ))}
          </section>
        )}

        {/* SECCIÓN: COPAS */}
        {filteredCategories.copas.length > 0 && (
          <section>
            <h3 style={styles.sectionTitle}>Copas y Torneos</h3>
            {filteredCategories.copas.map(league => (
              <LeagueItem 
                key={league.id} 
                league={league} 
                isSelected={selected === league.id} 
                count={matchCounts[league.id]} 
                onClick={() => onChange(league.id)}
              />
            ))}
          </section>
        )}

        {/* SECCIÓN: RESTO DEL MUNDO */}
        {filteredCategories.resto.length > 0 && (
          <section>
            <h3 style={styles.sectionTitle}>Resto del Mundo</h3>
            {filteredCategories.resto.map(league => (
              <LeagueItem 
                key={league.id} 
                league={league} 
                isSelected={selected === league.id} 
                count={matchCounts[league.id]} 
                onClick={() => onChange(league.id)}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}

// Sub-componente para cada fila de liga
const LeagueItem = ({ league, isSelected, count, onClick }: any) => (
  <button 
    onClick={onClick}
    style={{...styles.item, ...(isSelected ? styles.activeItem : {})}}
  >
    <div style={styles.leagueInfo}>
      <span style={styles.countryTag}>{league.country}</span>
      <span style={styles.leagueName}>{league.name}</span>
    </div>
    <span style={{...styles.badge, ...(isSelected ? styles.activeBadge : {})}}>
      {count ?? 0}
    </span>
  </button>
)

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '100%',
    maxWidth: '300px',
    background: '#f9fafb',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: '1px solid #e5e7eb'
  },
  searchContainer: {
    position: 'relative',
    marginBottom: '8px'
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '0.9rem',
    outline: 'none',
  },
  scrollArea: {
    maxHeight: '500px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  sectionTitle: {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    color: '#9ca3af',
    letterSpacing: '0.05em',
    margin: '16px 0 8px 8px',
    fontWeight: 700
  },
  item: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.2s',
  },
  activeItem: {
    background: '#0d0d0d',
    color: '#fff'
  },
  leagueInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  countryTag: {
    fontSize: '0.65rem',
    opacity: 0.6,
    fontWeight: 600
  },
  leagueName: {
    fontSize: '0.85rem',
    fontWeight: 500
  },
  badge: {
    fontSize: '0.7rem',
    background: '#e5e7eb',
    padding: '2px 8px',
    borderRadius: '6px',
    color: '#374151',
    fontWeight: 700
  },
  activeBadge: {
    background: '#b5f23d',
    color: '#0d0d0d'
  }
}