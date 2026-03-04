import { useState } from "react";
import type { Prediction } from "../services/api";

interface Props {
  prediction: Prediction;
  homeTeamName: string;
  awayTeamName: string;
}

const COLORS = {
  goals:   { accent: "#f59e0b", bg: "#fffbeb", icon: "⚽" },
  corners: { accent: "#3b82f6", bg: "#eff6ff", icon: "🚩" },
  cards:   { accent: "#ef4444", bg: "#fef2f2", icon: "🟨" },
  btts:    { accent: "#10b981", bg: "#ecfdf5", icon: "🤝" },
  winner:  { accent: "#8b5cf6", bg: "#f5f3ff", icon: "🏆" },
};

function Bar({ label, value, accent }: { label: string; value: number; accent: string }) {
  const pct = Math.round(value * 100);
  const color = pct >= 65 ? accent : pct >= 45 ? "#94a3b8" : "#cbd5e1";
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: "#e2e8f0", borderRadius: 99 }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: color, borderRadius: 99,
          transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px 0" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

// ─── Ganador ─────────────────────────────────────────────────────
function WinnerDetail({ detail, homeTeamName, awayTeamName, accent }: any) {
  const d = detail as { home: number; draw: number; away: number };
  return (
    <div style={{ paddingTop: 8 }}>
      <Bar label={homeTeamName} value={d.home} accent={accent} />
      <Bar label="Empate" value={d.draw} accent={accent} />
      <Bar label={awayTeamName} value={d.away} accent={accent} />
    </div>
  );
}

// ─── Goles ───────────────────────────────────────────────────────
function GoalsDetail({ detail, homeTeamName, awayTeamName, accent }: any) {
  const d = detail as {
    home: Record<string, number>;
    away: Record<string, number>;
    total: Record<string, number>;
  };
  return (
    <div style={{ paddingTop: 8 }}>
      <Section title={`${homeTeamName} (local)`}>
        {Object.entries(d.home).filter(([,v]) => v !== null).map(([k, v]) => (
          <Bar key={k} label={`Más de ${k.replace("over_","").replace("_",".")}`} value={v} accent={accent} />
        ))}
      </Section>
      <Section title={`${awayTeamName} (visitante)`}>
        {Object.entries(d.away).filter(([,v]) => v !== null).map(([k, v]) => (
          <Bar key={k} label={`Más de ${k.replace("over_","").replace("_",".")}`} value={v} accent={accent} />
        ))}
      </Section>
      <Section title="Total del partido">
        {Object.entries(d.total).filter(([,v]) => v !== null).map(([k, v]) => (
          <Bar key={k} label={`Más de ${k.replace("over_","").replace("_",".")}`} value={v} accent={accent} />
        ))}
      </Section>
    </div>
  );
}

// ─── Corners / Tarjetas ───────────────────────────────────────────
function OverUnderDetail({ detail, homeTeamName, awayTeamName, accent }: any) {
  const d = detail as {
    home: Record<string, number>;
    away: Record<string, number>;
    total: Record<string, number>;
  };
  return (
    <div style={{ paddingTop: 8 }}>
      <Section title={`${homeTeamName} (local)`}>
        {Object.entries(d.home).filter(([,v]) => v !== null).map(([k, v]) => (
          <Bar key={k} label={`Más de ${k.replace("over_","").replace("_",".")}`} value={v} accent={accent} />
        ))}
      </Section>
      <Section title={`${awayTeamName} (visitante)`}>
        {Object.entries(d.away).filter(([,v]) => v !== null).map(([k, v]) => (
          <Bar key={k} label={`Más de ${k.replace("over_","").replace("_",".")}`} value={v} accent={accent} />
        ))}
      </Section>
      <Section title="Total del partido">
        {Object.entries(d.total).filter(([,v]) => v !== null).map(([k, v]) => (
          <Bar key={k} label={`Más de ${k.replace("over_","").replace("_",".")}`} value={v} accent={accent} />
        ))}
      </Section>
    </div>
  );
}

// ─── BTTS ─────────────────────────────────────────────────────────
function BTTSDetail({ value, accent }: { value: number; accent: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ paddingTop: 8 }}>
      <Bar label="Ambos equipos anotan" value={value} accent={accent} />
      <Bar label="No anotan ambos" value={1 - value} accent="#94a3b8" />
    </div>
  );
}

// ─── Badge principal ──────────────────────────────────────────────
export function PredictionBadge({ prediction, homeTeamName, awayTeamName }: Props) {
  const [open, setOpen] = useState(false);

  const market = prediction.market as keyof typeof COLORS;
  const { accent, bg, icon } = COLORS[market] ?? COLORS.winner;
  const pct = Math.round((prediction.value ?? 0) * 100);

  let detail: any = null;
  try {
    if (prediction.detail) detail = JSON.parse(prediction.detail);
  } catch {}

  const MARKET_LABELS: Record<string, string> = {
    winner:  "Ganador",
    goals:   "Goles",
    corners: "Corners",
    cards:   "Tarjetas",
    btts:    "BTTS",
  };

  const PREDICTION_LABELS: Record<string, string> = {
    home:  homeTeamName,
    away:  awayTeamName,
    draw:  "Empate",
    over:  "Encima",
    under: "Bajo",
    yes:   "Sí",
    no:    "No",
  };

  const hasDetail = detail !== null;

  return (
    <div
      style={{
        background: open ? bg : "#fff",
        border: `1.5px solid ${open ? accent : "#e2e8f0"}`,
        borderRadius: 10,
        overflow: "hidden",
        transition: "all 0.2s ease",
        marginBottom: 8,
      }}
    >
      {/* Header — siempre visible */}
      <div
        onClick={() => hasDetail && setOpen(o => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          cursor: hasDetail ? "pointer" : "default",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
              {MARKET_LABELS[market] ?? market}
              {prediction.threshold !== null && prediction.threshold !== undefined
                ? ` +${prediction.threshold}`
                : ""}
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", margin: "2px 0 0 0" }}>
              {PREDICTION_LABELS[prediction.prediction] ?? prediction.prediction}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 15, fontWeight: 800,
            color: pct >= 65 ? accent : "#64748b",
          }}>
            {pct}%
          </span>
          {hasDetail && (
            <span style={{
              fontSize: 10, color: accent, fontWeight: 700,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
              display: "inline-block",
            }}>
              ▼
            </span>
          )}
        </div>
      </div>

      {/* Barra resumen */}
      <div style={{ padding: "0 12px 10px" }}>
        <div style={{ height: 4, background: "#e2e8f0", borderRadius: 99 }}>
          <div style={{
            width: `${pct}%`, height: "100%",
            background: pct >= 65 ? accent : "#94a3b8",
            borderRadius: 99,
            transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
          }} />
        </div>
      </div>

      {/* Detalle colapsable */}
      {hasDetail && open && (
        <div style={{
          padding: "0 12px 12px",
          borderTop: `1px solid ${accent}22`,
          animation: "fadeIn 0.2s ease",
        }}>
          {market === "winner" && (
            <WinnerDetail detail={detail} homeTeamName={homeTeamName} awayTeamName={awayTeamName} accent={accent} />
          )}
          {market === "goals" && (
            <GoalsDetail detail={detail} homeTeamName={homeTeamName} awayTeamName={awayTeamName} accent={accent} />
          )}
          {(market === "corners" || market === "cards") && (
            <OverUnderDetail detail={detail} homeTeamName={homeTeamName} awayTeamName={awayTeamName} accent={accent} />
          )}
          {market === "btts" && (
            <BTTSDetail value={prediction.value} accent={accent} />
          )}
        </div>
      )}
    </div>
  );
}