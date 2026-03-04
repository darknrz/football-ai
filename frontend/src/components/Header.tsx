import React from 'react'

interface HeaderProps {
  matchCount: number
  syncing: boolean
  onSync: () => void
}

export function Header({ matchCount, syncing, onSync }: HeaderProps) {
  const now = new Date()
  const dayName = now.toLocaleDateString('es-ES', { weekday: 'long' })
  const fullDate = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <div style={styles.brand}>
          <div style={styles.logoMark}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="#0d0d0d" strokeWidth="1.5"/>
              <path d="M10 1 L10 19 M1 10 L19 10 M3.5 3.5 L16.5 16.5 M16.5 3.5 L3.5 16.5" stroke="#0d0d0d" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <span style={styles.brandName}>FootballAI</span>
            <span style={styles.brandTag}>Predicciones</span>
          </div>
        </div>

        <div style={styles.center}>
          <p style={styles.dateDay}>{dayName}</p>
          <p style={styles.dateMain}>{fullDate}</p>
        </div>

        <div style={styles.actions}>
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            <span style={styles.badgeText}>{matchCount} partidos</span>
          </div>
          <button
            onClick={onSync}
            disabled={syncing}
            style={{ ...styles.syncBtn, opacity: syncing ? 0.7 : 1 }}
          >
            <span style={{ display: 'inline-block', animation: syncing ? 'spin 0.8s linear infinite' : 'none' }}>
              ↻
            </span>
            {syncing ? ' Sincronizando…' : ' Sincronizar'}
          </button>
        </div>
      </div>
    </header>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    background: '#fff',
    borderBottom: '1.5px solid #0d0d0d',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  inner: {
    maxWidth: 1280,
    margin: '0 auto',
    padding: '0 32px',
    height: 68,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 200,
  },
  logoMark: {
    width: 36,
    height: 36,
    background: '#b5f23d',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brandName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    color: '#0d0d0d',
    display: 'block',
    lineHeight: 1.1,
  },
  brandTag: {
    fontSize: '0.65rem',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#6b7280',
    display: 'block',
  },
  center: {
    textAlign: 'center',
    flex: 1,
  },
  dateDay: {
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#6b7280',
    lineHeight: 1,
    marginBottom: 2,
  },
  dateMain: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.05rem',
    color: '#0d0d0d',
    lineHeight: 1,
    textTransform: 'capitalize',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 200,
    justifyContent: 'flex-end',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    background: '#f2fadf',
    border: '1px solid #d4f07a',
    borderRadius: 99,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#8ecf1a',
    animation: 'pulse 2s ease infinite',
    display: 'block',
  },
  badgeText: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#4a7a00',
  },
  syncBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '7px 16px',
    background: '#0d0d0d',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.8rem',
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
    letterSpacing: '0.02em',
  },
}