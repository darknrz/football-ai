import React from 'react'
import type { Match } from '../services/api'

interface SummaryBarProps {
  matches: Match[]
}

export function SummaryBar({ matches }: SummaryBarProps) {
  const finished = matches.filter(m => m.status === 'FT')
  const live = matches.filter(m => m.status === '1H' || m.status === '2H' || m.status === 'HT')
  const upcoming = matches.filter(m => m.status === 'NS')
  const withPreds = matches.filter(m => m.predictions && m.predictions.length > 0)

  const stats = [
    { label: 'En vivo', value: live.length, accent: '#10b981', bg: '#d1fae5' },
    { label: 'Próximos', value: upcoming.length, accent: '#3b82f6', bg: '#dbeafe' },
    { label: 'Finalizados', value: finished.length, accent: '#6b7280', bg: '#f3f4f6' },
    { label: 'Con predicción', value: withPreds.length, accent: '#8ecf1a', bg: '#f2fadf' },
  ]

  return (
    <div style={styles.bar}>
      {stats.map((s) => (
        <div key={s.label} style={styles.stat}>
          <span style={{ ...styles.statNum, color: s.accent }}>{s.value}</span>
          <span style={styles.statLabel}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    gap: 2,
    background: '#f3f4f6',
    borderRadius: 14,
    padding: 2,
    marginBottom: 4,
  },
  stat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '12px 8px',
    background: '#fff',
    borderRadius: 12,
  },
  statNum: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.8rem',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '0.65rem',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#9ca3af',
  },
}