import React from 'react'
import type { Prediction } from '../services/api';

const MARKET_META: Record<string, { label: string; emoji: string }> = {
  winner:       { label: 'Ganador',  emoji: '🏆' },
  over_goals:   { label: 'Goles',    emoji: '⚽' },
  over_corners: { label: 'Corners',  emoji: '🎯' },
  over_cards:   { label: 'Tarjetas', emoji: '🟨' },
  btts:         { label: 'BTTS',     emoji: '🤝' },
}

const PREDICTION_LABELS: Record<string, string> = {
  over: 'Over', under: 'Under',
  home: 'Local', away: 'Visitante', draw: 'Empate',
  yes: 'Sí', no: 'No',
}

interface PredictionBadgeProps {
  prediction: Prediction
  homeTeamName?: string
  awayTeamName?: string
}

export function PredictionBadge({ prediction, homeTeamName, awayTeamName }: PredictionBadgeProps) {
  const meta = MARKET_META[prediction.market] ?? { label: prediction.market, emoji: '📊' }
  const conf = Math.round(prediction.value * 100)
  const label = prediction.market === 'winner' && homeTeamName && awayTeamName
    ? prediction.prediction === 'home' ? homeTeamName
    : prediction.prediction === 'away' ? awayTeamName
    : 'Empate'
    : (PREDICTION_LABELS[prediction.prediction] ?? prediction.prediction)

  const isHigh = conf >= 65
  const isMed = conf >= 50 && conf < 65

  return (
    <div style={styles.badge}>
      <div style={styles.top}>
        <span style={styles.emoji}>{meta.emoji}</span>
        <span style={styles.market}>{meta.label}</span>
        {prediction.threshold && (
          <span style={styles.threshold}>
            {prediction.threshold}
          </span>
        )}
      </div>
      <div style={styles.bottom}>
        <span style={styles.predLabel}>{label}</span>
        <div style={styles.confRow}>
          <div style={styles.barBg}>
            <div
              style={{
                ...styles.barFill,
                width: `${conf}%`,
                background: isHigh ? '#8ecf1a' : isMed ? '#f59e0b' : '#9ca3af',
              }}
            />
          </div>
          <span style={{
            ...styles.confNum,
            color: isHigh ? '#4a7a00' : isMed ? '#92400e' : '#6b7280',
          }}>
            {conf}%
          </span>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    background: '#fff',
    border: '1.5px solid #e5e7eb',
    borderRadius: 10,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minWidth: 120,
    flex: '1 1 120px',
  },
  top: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  emoji: {
    fontSize: '0.85rem',
    lineHeight: 1,
  },
  market: {
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#6b7280',
    flex: 1,
  },
  threshold: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: '#9ca3af',
    background: '#f3f4f6',
    padding: '1px 5px',
    borderRadius: 4,
  },
  bottom: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  predLabel: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: '#0d0d0d',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  confRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  barBg: {
    flex: 1,
    height: 4,
    background: '#f3f4f6',
    borderRadius: 99,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
    transition: 'width 0.6s ease',
  },
  confNum: {
    fontSize: '0.72rem',
    fontWeight: 700,
    minWidth: 30,
    textAlign: 'right',
  },
}