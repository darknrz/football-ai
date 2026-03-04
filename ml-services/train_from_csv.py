"""
train_from_csv_v2.py — Entrena con promedios históricos (sin data leakage)

La diferencia con v1:
  - Para cada partido, calcula el promedio de los 5 partidos ANTERIORES de cada equipo
  - Usa esos promedios como features (lo que realmente sabes ANTES del partido)
  - Evita el data leakage de usar stats del partido actual para predecir ese mismo partido

Uso:
  python train_from_csv_v2.py --folder "C:\\ruta\\data"
"""

import argparse
import os
import glob
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

XGB_PARAMS = dict(
    n_estimators=300,
    max_depth=4,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    verbosity=0,
)

parser = argparse.ArgumentParser()
parser.add_argument("--folder", required=True)
parser.add_argument("--window", type=int, default=5, help="Partidos anteriores a promediar")
args = parser.parse_args()

print("\n============================================")
print("  FOOTBALL AI v2 — Sin data leakage")
print("============================================\n")

# ─── Leer CSVs ────────────────────────────────────────────────────
csv_files = glob.glob(os.path.join(args.folder, "*.csv"))
print(f"📄 CSVs encontrados: {len(csv_files)}\n")

frames = []
for f in csv_files:
    try:
        try:
            df = pd.read_csv(f, encoding="utf-8", on_bad_lines="skip")
        except UnicodeDecodeError:
            df = pd.read_csv(f, encoding="latin-1", on_bad_lines="skip")
        df = df.dropna(how="all")
        frames.append(df)
        print(f"  ✅ {os.path.basename(f)} → {len(df)} filas")
    except Exception as e:
        print(f"  ⚠️  {os.path.basename(f)} → {e}")

raw = pd.concat(frames, ignore_index=True)

# ─── Columnas estándar ────────────────────────────────────────────
col_map = {c.strip().upper(): c for c in raw.columns}

def gcol(candidates):
    for c in candidates:
        if c.upper() in col_map:
            return pd.to_numeric(raw[col_map[c.upper()]], errors="coerce")
    return pd.Series([np.nan] * len(raw))

raw2 = pd.DataFrame({
    "date":       pd.to_datetime(raw.get("Date", pd.Series()), dayfirst=True, errors="coerce"),
    "home":       raw.get("HomeTeam", pd.Series()).astype(str).str.strip(),
    "away":       raw.get("AwayTeam", pd.Series()).astype(str).str.strip(),
    "home_goals": gcol(["FTHG", "HG"]),
    "away_goals": gcol(["FTAG", "AG"]),
    "home_shots": gcol(["HS"]),
    "away_shots": gcol(["AS"]),
    "home_sot":   gcol(["HST"]),
    "away_sot":   gcol(["AST"]),
    "home_corn":  gcol(["HC"]),
    "away_corn":  gcol(["AC"]),
    "home_cards": gcol(["HY"]),
    "away_cards": gcol(["AY"]),
    "home_fouls": gcol(["HF"]),
    "away_fouls": gcol(["AF"]),
})

# Quitar filas sin goles reales
raw2 = raw2.dropna(subset=["home_goals", "away_goals", "date"])
raw2 = raw2[raw2["home_goals"] + raw2["away_goals"] > 0]
raw2 = raw2.sort_values("date").reset_index(drop=True)

print(f"\n📊 Partidos válidos: {len(raw2)}")
print(f"   Ventana histórica: últimos {args.window} partidos por equipo\n")

# ─── Calcular promedios históricos por equipo ─────────────────────
def team_history(df, window=5):
    """
    Para cada partido, calcula el promedio de las últimas `window` apariciones
    del equipo local y visitante ANTES de ese partido.
    """
    stats_cols = ["home_goals", "away_goals", "home_shots", "away_shots",
                  "home_sot", "away_sot", "home_corn", "away_corn",
                  "home_cards", "away_cards"]

    # Índice: team → lista de (date, stats_as_home, stats_as_away)
    team_matches: dict = {}

    features = []

    for idx, row in df.iterrows():
        h, a = row["home"], row["away"]

        def get_avg(team, is_home):
            hist = team_matches.get(team, [])
            if not hist:
                return None
            recent = hist[-window:]
            vals = {}
            for m in recent:
                if m["is_home"]:
                    vals.setdefault("shots", []).append(m["shots"])
                    vals.setdefault("sot", []).append(m["sot"])
                    vals.setdefault("corn", []).append(m["corn"])
                    vals.setdefault("cards", []).append(m["cards"])
                    vals.setdefault("gf", []).append(m["gf"])
                    vals.setdefault("ga", []).append(m["ga"])
                else:
                    vals.setdefault("shots", []).append(m["shots"])
                    vals.setdefault("sot", []).append(m["sot"])
                    vals.setdefault("corn", []).append(m["corn"])
                    vals.setdefault("cards", []).append(m["cards"])
                    vals.setdefault("gf", []).append(m["gf"])
                    vals.setdefault("ga", []).append(m["ga"])
            return {k: np.nanmean(v) for k, v in vals.items()}

        h_avg = get_avg(h, True)
        a_avg = get_avg(a, False)

        if h_avg and a_avg:
            feat = {
                "home_avg_shots":           h_avg.get("shots", 13.0),
                "away_avg_shots":           a_avg.get("shots", 11.0),
                "home_avg_shots_on_target": h_avg.get("sot",   4.5),
                "away_avg_shots_on_target": a_avg.get("sot",   3.8),
                "home_avg_corners":         h_avg.get("corn",  5.2),
                "away_avg_corners":         a_avg.get("corn",  4.8),
                "home_avg_cards":           h_avg.get("cards", 1.8),
                "away_avg_cards":           a_avg.get("cards", 1.6),
                # Targets
                "total_goals":   row["home_goals"] + row["away_goals"],
                "total_corners": row["home_corn"] + row["away_corn"] if pd.notna(row["home_corn"]) else np.nan,
                "total_cards":   row["home_cards"] + row["away_cards"] if pd.notna(row["home_cards"]) else np.nan,
                "home_goals":    row["home_goals"],
                "away_goals":    row["away_goals"],
            }
            features.append(feat)

        # Actualizar historial
        for team, is_home, shots, sot, corn, cards, gf, ga in [
            (h, True,  row["home_shots"], row["home_sot"], row["home_corn"], row["home_cards"], row["home_goals"], row["away_goals"]),
            (a, False, row["away_shots"], row["away_sot"], row["away_corn"], row["away_cards"], row["away_goals"], row["home_goals"]),
        ]:
            team_matches.setdefault(team, []).append({
                "is_home": is_home,
                "shots": shots, "sot": sot, "corn": corn,
                "cards": cards, "gf": gf, "ga": ga,
            })

    return pd.DataFrame(features)

data = team_history(raw2, window=args.window)
data = data.dropna().reset_index(drop=True)

print(f"   Partidos con historial suficiente: {len(data)}\n")

# ─── Targets ──────────────────────────────────────────────────────
data["over_2_5"]        = (data["total_goals"]   > 2.5).astype(int)
data["over_8_5_corners"]= (data["total_corners"] > 8.5).astype(int)
data["over_3_5_cards"]  = (data["total_cards"]   > 3.5).astype(int)
data["btts"]            = ((data["home_goals"] > 0) & (data["away_goals"] > 0)).astype(int)
data["winner"]          = np.where(data["home_goals"] > data["away_goals"], 1,
                          np.where(data["home_goals"] < data["away_goals"], 2, 0))

FEATURE_COLS = [
    "home_avg_shots", "away_avg_shots",
    "home_avg_shots_on_target", "away_avg_shots_on_target",
    "home_avg_corners", "away_avg_corners",
    "home_avg_cards", "away_avg_cards",
]

X = data[FEATURE_COLS].fillna(0)

print(f"   Over 2.5 goles    : {data['over_2_5'].sum()} ({round(data['over_2_5'].mean()*100)}%)")
print(f"   Over 8.5 corners  : {data['over_8_5_corners'].sum()} ({round(data['over_8_5_corners'].mean()*100)}%)")
print(f"   Over 3.5 tarjetas : {data['over_3_5_cards'].sum()} ({round(data['over_3_5_cards'].mean()*100)}%)")
print(f"   BTTS              : {data['btts'].sum()} ({round(data['btts'].mean()*100)}%)")

# ─── Entrenar ─────────────────────────────────────────────────────
def train_binary(target, name, label):
    y = data[target].astype(int)
    if y.nunique() < 2:
        print(f"⚠️  {label}: solo una clase, saltando")
        return
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
    model = xgb.XGBClassifier(**XGB_PARAMS, eval_metric="logloss")
    model.fit(X_tr, y_tr)
    preds = model.predict(X_te)
    acc   = accuracy_score(y_te, preds)
    print(f"\n📊 {label}")
    print(f"   Accuracy: {acc:.3f} ({round(acc*100,1)}%)")
    print(classification_report(y_te, preds, zero_division=0))
    joblib.dump(model, os.path.join(MODELS_DIR, f"{name}.pkl"))
    print(f"   ✅ models/{name}.pkl")

def train_multiclass(target, name, label):
    y = data[target].astype(int)
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
    model = xgb.XGBClassifier(
        **XGB_PARAMS,
        objective="multi:softprob",
        num_class=3,
        eval_metric="mlogloss"
    )
    model.fit(X_tr, y_tr)
    preds = model.predict(X_te)
    acc   = accuracy_score(y_te, preds)
    print(f"\n📊 {label}")
    print(f"   Accuracy: {acc:.3f} ({round(acc*100,1)}%)")
    print(classification_report(y_te, preds, zero_division=0))
    joblib.dump(model, os.path.join(MODELS_DIR, f"{name}.pkl"))
    print(f"   ✅ models/{name}.pkl")

print("\n🏋️  Entrenando modelos...\n")
train_binary("over_2_5",          "goals",   "Over 2.5 Goles")
train_binary("over_8_5_corners",  "corners", "Over 8.5 Corners")
train_binary("over_3_5_cards",    "cards",   "Over 3.5 Tarjetas")
train_binary("btts",              "btts",    "BTTS")
train_multiclass("winner",        "winner",  "Ganador")

print("\n============================================")
print("  ✅ LISTO — modelos sin data leakage")
print("============================================")
print("  Reinicia el ML Service para cargar los nuevos modelos")
print("")