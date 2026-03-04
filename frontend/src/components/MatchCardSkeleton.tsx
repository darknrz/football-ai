import React from 'react'

function Skel({ w = '100%', h = 16, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w,
      height: h,
      borderRadius: r,
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)',
      backgroundSize: '600px 100%',
      animation: 'shimmer 1.4s ease infinite',
    }} />
  )
}

export function MatchCardSkeleton() {
  return (
    <div style={styles.card}>
      <div style={styles.leagueRow}>
        <Skel w={140} h={12} />
        <Skel w={60} h={20} r={99} />
      </div>
      <div style={styles.matchMain}>
        <div style={styles.teamSide}>
          <Skel w={42} h={42} r={10} />
          <Skel w={90} h={13} />
          <Skel w={40} h={10} />
        </div>
        <Skel w={80} h={40} r={8} />
        <div style={{ ...styles.teamSide, alignItems: 'flex-end' }}>
          <Skel w={42} h={42} r={10} />
          <Skel w={90} h={13} />
          <Skel w={40} h={10} />
        </div>
      </div>
      <div style={styles.predSection}>
        <Skel w={120} h={10} />
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          {[1, 2, 3].map(i => <Skel key={i} w={110} h={68} r={10} />)}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff',
    border: '1.5px solid #e5e7eb',
    borderRadius: 16,
    overflow: 'hidden',
  },
  leagueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 18px',
    borderBottom: '1px solid #f3f4f6',
    background: '#fafafa',
  },
  matchMain: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    gap: 12,
    padding: '20px 24px',
  },
  teamSide: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  predSection: {
    padding: '14px 18px 18px',
  },
}