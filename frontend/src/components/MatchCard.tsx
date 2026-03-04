import React, { useState } from "react";
import { generatePredictions, fetchPredictions } from "../services/api";
import type { Match, Prediction } from "../services/api";
import { PredictionBadge } from "./PredictionBadge";

interface MatchCardProps {
  match: Match;
  index: number;
  teamNames: Record<number, string>;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> =
  {
    NS: { label: "Por jugar", color: "#374151", bg: "#f3f4f6" },
    "1H": { label: "En juego", color: "#064e3b", bg: "#d1fae5" },
    HT: { label: "Descanso", color: "#92400e", bg: "#fef3c7" },
    "2H": { label: "En juego", color: "#064e3b", bg: "#d1fae5" },
    FT: { label: "Finalizado", color: "#374151", bg: "#f3f4f6" },
    PST: { label: "Postponido", color: "#7c3aed", bg: "#ede9fe" },
  };

export function MatchCard({ match, index, teamNames }: MatchCardProps) {
  const [predictions, setPredictions] = useState<Prediction[]>(
    match.predictions ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const homeTeam =
    match.homeTeamName ??
    teamNames[match.homeTeamId] ??
    `Equipo #${match.homeTeamId}`;
  const awayTeam =
    match.awayTeamName ??
    teamNames[match.awayTeamId] ??
    `Equipo #${match.awayTeamId}`;

  const time = new Date(match.date).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const status = STATUS_MAP[match.status] ?? {
    label: match.status,
    color: "#374151",
    bg: "#f3f4f6",
  };
  const isLive =
    match.status === "1H" || match.status === "2H" || match.status === "HT";
  const isFinished = match.status === "FT";
  const hasPredictions = predictions.length > 0;

  const handlePredict = async () => {
    try {
      setLoading(true);
      setError(null);
      await generatePredictions(match.id);
      const updated = await fetchPredictions(match.id);
      setPredictions(updated);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 422) {
        setError("no_data");
      } else {
        setError("error");
      }
    } finally {
      setLoading(false);
    }
  };

  const delayClass = [
    "fade-up",
    `fade-up-delay-${Math.min((index % 4) + 1, 4)}`,
  ].join(" ");

  return (
    <article className={delayClass} style={styles.card}>
      {/* League row */}
      <div style={styles.leagueRow}>
        <div style={styles.leagueInfo}>
          <span style={styles.leagueFlag}>
            {getFlagEmoji(match.season?.league?.country)}
          </span>
          <span style={styles.leagueName}>
            {match.season?.league?.name ?? "Liga desconocida"}
          </span>
          <span style={styles.leagueSep}>·</span>
          <span style={styles.leagueCountry}>
            {match.season?.league?.country}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isLive && (
            <span style={styles.liveIndicator}>
              <span style={styles.liveDot} />
              EN VIVO
            </span>
          )}
          <span
            style={{
              ...styles.statusBadge,
              color: status.color,
              background: status.bg,
            }}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Match main */}
      <div style={styles.matchMain}>
        {/* Home */}
        <div style={styles.teamSide}>
          <div style={styles.teamAvatar}>
            {homeTeam.slice(0, 2).toUpperCase()}
          </div>
          <span style={styles.teamName}>{homeTeam}</span>
          <span style={styles.teamRole}>Local</span>
        </div>

        {/* Score / Time */}
        <div style={styles.centerBlock}>
          {isFinished || isLive ? (
            <div style={styles.score}>
              <span style={styles.scoreNum}>{match.homeGoals ?? 0}</span>
              <span style={styles.scoreDash}>–</span>
              <span style={styles.scoreNum}>{match.awayGoals ?? 0}</span>
            </div>
          ) : (
            <div style={styles.timeBlock}>
              <span style={styles.timeText}>{time}</span>
              <span style={styles.vsText}>vs</span>
            </div>
          )}
        </div>

        {/* Away */}
        <div
          style={{
            ...styles.teamSide,
            alignItems: "flex-end",
            textAlign: "right",
          }}
        >
          <div style={styles.teamAvatar}>
            {awayTeam.slice(0, 2).toUpperCase()}
          </div>
          <span style={styles.teamName}>{awayTeam}</span>
          <span style={styles.teamRole}>Visitante</span>
        </div>
      </div>

      {/* Stats strip (if available) */}
      {match.stats && (
        <div style={styles.statsStrip}>
          <StatPill
            label="Tiros"
            home={match.stats.homeShots}
            away={match.stats.awayShots}
          />
          <StatPill
            label="Al arco"
            home={match.stats.homeShotsOnTarget}
            away={match.stats.awayShotsOnTarget}
          />
          <StatPill
            label="Corners"
            home={match.stats.homeCorners}
            away={match.stats.awayCorners}
          />
          <StatPill
            label="Amarillas"
            home={match.stats.homeYellowCards}
            away={match.stats.awayYellowCards}
          />
        </div>
      )}

      {/* Predictions */}
      <div style={styles.predSection}>
        {hasPredictions ? (
          <>
            <p style={styles.predTitle}>Predicciones IA</p>
            <div style={styles.predGrid}>
              {predictions.map((p) => (
                <PredictionBadge
                  key={p.id}
                  prediction={p}
                  homeTeamName={homeTeam}
                  awayTeamName={awayTeam}
                />
              ))}
            </div>
          </>
        ) : (
          <div style={styles.predEmpty}>
            {error === "no_data" ? (
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fcd34d",
                  borderRadius: 8,
                  padding: "12px 14px",
                  marginBottom: 10,
                }}
              >
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: "#92400e",
                    margin: "0 0 4px 0",
                  }}
                >
                  Sin datos historicos
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "#78350f",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  No hay historial de este equipo. Descarga mas ligas de{" "}
                  <a
                    href="https://www.football-data.co.uk"
                    target="_blank"
                    style={{ color: "#92400e" }}
                  >
                    football-data.co.uk
                  </a>
                </p>
              </div>
            ) : error === "error" ? (
              <p style={styles.errorText}>Error al conectar con el servicio</p>
            ) : (
              <p style={styles.noPredText}>Sin predicciones generadas</p>
            )}
            <button
              onClick={handlePredict}
              disabled={loading}
              style={{ ...styles.predictBtn, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "⏳ Generando…" : "✦ Generar predicción"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function StatPill({
  label,
  home,
  away,
}: {
  label: string;
  home: number | null;
  away: number | null;
}) {
  if (home === null && away === null) return null;
  const h = home ?? 0;
  const a = away ?? 0;
  const total = h + a || 1;
  const homePct = (h / total) * 100;

  return (
    <div style={statStyles.pill}>
      <div style={statStyles.row}>
        <span style={statStyles.val}>{h}</span>
        <span style={statStyles.label}>{label}</span>
        <span style={statStyles.val}>{a}</span>
      </div>
      <div style={statStyles.bar}>
        <div style={{ ...statStyles.barHome, width: `${homePct}%` }} />
      </div>
    </div>
  );
}

function getFlagEmoji(country?: string): string {
  if (!country) return "🌐";
  const flags: Record<string, string> = {
    Spain: "🇪🇸",
    England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    Germany: "🇩🇪",
    France: "🇫🇷",
    Italy: "🇮🇹",
    Brazil: "🇧🇷",
    Argentina: "🇦🇷",
    Portugal: "🇵🇹",
    Netherlands: "🇳🇱",
    Belgium: "🇧🇪",
    Mexico: "🇲🇽",
    USA: "🇺🇸",
    Colombia: "🇨🇴",
    Chile: "🇨🇱",
    Peru: "🇵🇪",
    Uruguay: "🇺🇾",
    World: "🌍",
    Europe: "🇪🇺",
  };
  return flags[country] ?? "🌐";
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#fff",
    border: "1.5px solid #e5e7eb",
    borderRadius: 16,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    transition: "box-shadow 0.2s, border-color 0.2s",
  },
  leagueRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 18px",
    borderBottom: "1px solid #f3f4f6",
    background: "#fafafa",
    gap: 8,
  },
  leagueInfo: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  leagueFlag: { fontSize: "0.85rem" },
  leagueName: {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#1a1a1a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  leagueSep: { color: "#d1d5db", fontSize: "0.7rem" },
  leagueCountry: {
    fontSize: "0.68rem",
    color: "#9ca3af",
    whiteSpace: "nowrap",
  },
  statusBadge: {
    fontSize: "0.62rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "3px 8px",
    borderRadius: 99,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  liveIndicator: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: "0.62rem",
    fontWeight: 700,
    color: "#059669",
    letterSpacing: "0.06em",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#10b981",
    display: "inline-block",
    animation: "pulse 1s ease infinite",
  },
  matchMain: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 12,
    padding: "20px 24px",
  },
  teamSide: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
  },
  teamAvatar: {
    width: 42,
    height: 42,
    background: "#0d0d0d",
    color: "#b5f23d",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: 800,
    letterSpacing: "0.05em",
    fontFamily: "var(--font-body)",
  },
  teamName: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#0d0d0d",
    lineHeight: 1.2,
  },
  teamRole: {
    fontSize: "0.62rem",
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#9ca3af",
  },
  centerBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  score: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  scoreNum: {
    fontFamily: "var(--font-display)",
    fontSize: "2.4rem",
    color: "#0d0d0d",
    lineHeight: 1,
  },
  scoreDash: {
    fontFamily: "var(--font-display)",
    fontSize: "1.5rem",
    color: "#d1d5db",
    lineHeight: 1,
  },
  timeBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  timeText: {
    fontFamily: "var(--font-display)",
    fontSize: "1.6rem",
    color: "#0d0d0d",
    lineHeight: 1,
  },
  vsText: {
    fontSize: "0.65rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#9ca3af",
  },
  statsStrip: {
    display: "flex",
    gap: 1,
    background: "#f3f4f6",
    padding: "1px",
    margin: "0 18px",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 4,
  },
  predSection: {
    padding: "14px 18px 18px",
  },
  predTitle: {
    fontSize: "0.65rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#6b7280",
    marginBottom: 10,
  },
  predGrid: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  predEmpty: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 14px",
    background: "#fafafa",
    borderRadius: 10,
    border: "1.5px dashed #e5e7eb",
  },
  noPredText: {
    fontSize: "0.78rem",
    color: "#9ca3af",
    fontWeight: 500,
  },
  errorText: {
    fontSize: "0.75rem",
    color: "#ef4444",
    fontWeight: 500,
    flex: 1,
  },
  predictBtn: {
    padding: "7px 14px",
    background: "#b5f23d",
    color: "#0d0d0d",
    border: "none",
    borderRadius: 8,
    fontSize: "0.75rem",
    fontFamily: "var(--font-body)",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "transform 0.1s",
    flexShrink: 0,
  },
};

const statStyles: Record<string, React.CSSProperties> = {
  pill: {
    flex: 1,
    background: "#fff",
    padding: "8px 8px 6px",
    display: "flex",
    flexDirection: "column",
    gap: 5,
    alignItems: "stretch",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: "0.6rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#9ca3af",
    textAlign: "center",
    flex: 1,
  },
  val: {
    fontSize: "0.8rem",
    fontWeight: 700,
    color: "#0d0d0d",
    minWidth: 18,
    textAlign: "center",
  },
  bar: {
    height: 3,
    background: "#f3f4f6",
    borderRadius: 99,
    overflow: "hidden",
  },
  barHome: {
    height: "100%",
    background: "#b5f23d",
    borderRadius: 99,
  },
  noDataBox: {
    background: "#fffbeb",
    border: "1px solid #fcd34d",
    borderRadius: 8,
    padding: "12px 14px",
    marginBottom: 10,
  },
  noDataTitle: {
    fontWeight: 700,
    fontSize: 13,
    color: "#92400e",
    margin: "0 0 4px 0",
  },
  noDataText: {
    fontSize: 12,
    color: "#78350f",
    margin: 0,
    lineHeight: 1.5,
  },
};
