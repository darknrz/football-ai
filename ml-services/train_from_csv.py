"""
train_from_csv_v3.py — Entrena modelos para múltiples umbrales

Modelos generados:
  Goles equipo: goals_team_0_5, goals_team_1_5, goals_team_2_5
  Goles total:  goals_total_0_5, goals_total_1_5, goals_total_2_5, goals_total_3_5, goals_total_4_5
  Corners equipo: corners_team_2_5, corners_team_3_5, corners_team_4_5, corners_team_5_5
  Corners total:  corners_total_6_5, corners_total_7_5, corners_total_8_5, corners_total_9_5, corners_total_10_5, corners_total_11_5
  Tarjetas equipo: cards_team_0_5, cards_team_1_5, cards_team_2_5, cards_team_3_5
  Tarjetas total:  cards_total_1_5, cards_total_2_5, cards_total_3_5, cards_total_4_5, cards_total_5_5
  BTTS: btts
  Ganador: winner

Uso:
  python train_from_csv_v3.py --folder "C:\\ruta\\data"
"""

import argparse
import os
import glob
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
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
parser.add_argument("--window", type=int, default=5)
args = parser.parse_args()

print("\n============================================")
print("  FOOTBALL AI v3 — Multi-umbral")
print("============================================\n")

# ─── Leer CSVs ────────────────────────────────────────────────────
csv_files = glob.glob(os.path.join(args.folder, "*.csv"))
print(f"📄 CSVs: {len(csv_files)}\n")

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

raw2 = raw2.dropna(subset=["home_goals", "away_goals", "date"])
raw2 = raw2[raw2["home_goals"] + raw2["away_goals"] > 0]
raw2 = raw2.sort_values("date").reset_index(drop=True)

print(f"\n📊 Partidos válidos: {len(raw2)}")

# ─── Historial por equipo ─────────────────────────────────────────
def build_dataset(df, window=5):
    team_matches = {}
    features = []

    for _, row in df.iterrows():
        h, a = row["home"], row["away"]

        def get_avg(team):
            hist = team_matches.get(team, [])
            if not hist:
                return None
            recent = hist[-window:]
            return {
                "shots":  np.nanmean([m["shots"]  for m in recent]),
                "sot":    np.nanmean([m["sot"]    for m in recent]),
                "corn":   np.nanmean([m["corn"]   for m in recent]),
                "cards":  np.nanmean([m["cards"]  for m in recent]),
                "gf":     np.nanmean([m["gf"]     for m in recent]),
                "ga":     np.nanmean([m["ga"]     for m in recent]),
            }

        ha = get_avg(h)
        aa = get_avg(a)

        if ha and aa:
            features.append({
                # Features
                "home_avg_shots":   ha["shots"], "away_avg_shots":   aa["shots"],
                "home_avg_sot":     ha["sot"],   "away_avg_sot":     aa["sot"],
                "home_avg_corners": ha["corn"],  "away_avg_corners": aa["corn"],
                "home_avg_cards":   ha["cards"], "away_avg_cards":   aa["cards"],
                "home_avg_gf":      ha["gf"],    "away_avg_gf":      aa["gf"],
                "home_avg_ga":      ha["ga"],    "away_avg_ga":      aa["ga"],
                # Raw results for targets
                "home_goals":  row["home_goals"],
                "away_goals":  row["away_goals"],
                "home_corn":   row["home_corn"],
                "away_corn":   row["away_corn"],
                "home_cards":  row["home_cards"],
                "away_cards":  row["away_cards"],
            })

        for team, gf, ga, shots, sot, corn, cards in [
            (h, row["home_goals"], row["away_goals"], row["home_shots"], row["home_sot"], row["home_corn"], row["home_cards"]),
            (a, row["away_goals"], row["home_goals"], row["away_shots"], row["away_sot"], row["away_corn"], row["away_cards"]),
        ]:
            team_matches.setdefault(team, []).append({
                "gf": gf, "ga": ga, "shots": shots,
                "sot": sot, "corn": corn, "cards": cards,
            })

    return pd.DataFrame(features)

data = build_dataset(raw2, window=args.window)
data = data.dropna().reset_index(drop=True)
print(f"   Con historial: {len(data)}\n")

FEATURE_COLS = [
    "home_avg_shots", "away_avg_shots",
    "home_avg_sot",   "away_avg_sot",
    "home_avg_corners", "away_avg_corners",
    "home_avg_cards", "away_avg_cards",
    "home_avg_gf",    "away_avg_gf",
    "home_avg_ga",    "away_avg_ga",
]

X = data[FEATURE_COLS].fillna(0)

# ─── Targets ──────────────────────────────────────────────────────
total_goals   = data["home_goals"]   + data["away_goals"]
total_corners = data["home_corn"]    + data["away_corn"]
total_cards   = data["home_cards"]   + data["away_cards"]

targets = {
    # Goles equipo local
    "goals_home_0_5": (data["home_goals"] > 0.5).astype(int),
    "goals_home_1_5": (data["home_goals"] > 1.5).astype(int),
    "goals_home_2_5": (data["home_goals"] > 2.5).astype(int),
    # Goles equipo visitante
    "goals_away_0_5": (data["away_goals"] > 0.5).astype(int),
    "goals_away_1_5": (data["away_goals"] > 1.5).astype(int),
    "goals_away_2_5": (data["away_goals"] > 2.5).astype(int),
    # Goles totales
    "goals_total_0_5": (total_goals > 0.5).astype(int),
    "goals_total_1_5": (total_goals > 1.5).astype(int),
    "goals_total_2_5": (total_goals > 2.5).astype(int),
    "goals_total_3_5": (total_goals > 3.5).astype(int),
    "goals_total_4_5": (total_goals > 4.5).astype(int),
    # Corners equipo local
    "corners_home_2_5": (data["home_corn"] > 2.5).astype(int),
    "corners_home_3_5": (data["home_corn"] > 3.5).astype(int),
    "corners_home_4_5": (data["home_corn"] > 4.5).astype(int),
    "corners_home_5_5": (data["home_corn"] > 5.5).astype(int),
    # Corners equipo visitante
    "corners_away_2_5": (data["away_corn"] > 2.5).astype(int),
    "corners_away_3_5": (data["away_corn"] > 3.5).astype(int),
    "corners_away_4_5": (data["away_corn"] > 4.5).astype(int),
    "corners_away_5_5": (data["away_corn"] > 5.5).astype(int),
    # Corners totales
    "corners_total_6_5":  (total_corners > 6.5).astype(int),
    "corners_total_7_5":  (total_corners > 7.5).astype(int),
    "corners_total_8_5":  (total_corners > 8.5).astype(int),
    "corners_total_9_5":  (total_corners > 9.5).astype(int),
    "corners_total_10_5": (total_corners > 10.5).astype(int),
    "corners_total_11_5": (total_corners > 11.5).astype(int),
    # Tarjetas equipo local
    "cards_home_0_5": (data["home_cards"] > 0.5).astype(int),
    "cards_home_1_5": (data["home_cards"] > 1.5).astype(int),
    "cards_home_2_5": (data["home_cards"] > 2.5).astype(int),
    "cards_home_3_5": (data["home_cards"] > 3.5).astype(int),
    # Tarjetas equipo visitante
    "cards_away_0_5": (data["away_cards"] > 0.5).astype(int),
    "cards_away_1_5": (data["away_cards"] > 1.5).astype(int),
    "cards_away_2_5": (data["away_cards"] > 2.5).astype(int),
    "cards_away_3_5": (data["away_cards"] > 3.5).astype(int),
    # Tarjetas totales
    "cards_total_1_5": (total_cards > 1.5).astype(int),
    "cards_total_2_5": (total_cards > 2.5).astype(int),
    "cards_total_3_5": (total_cards > 3.5).astype(int),
    "cards_total_4_5": (total_cards > 4.5).astype(int),
    "cards_total_5_5": (total_cards > 5.5).astype(int),
    # BTTS
    "btts": ((data["home_goals"] > 0) & (data["away_goals"] > 0)).astype(int),
    # Ganador
    "winner": np.where(data["home_goals"] > data["away_goals"], 1,
              np.where(data["home_goals"] < data["away_goals"], 2, 0)),
}

# ─── Entrenar ─────────────────────────────────────────────────────
print("🏋️  Entrenando modelos...\n")

def train_binary(name, y):
    if y.nunique() < 2:
        print(f"  ⚠️  {name}: una sola clase, saltando")
        return
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
    model = xgb.XGBClassifier(**XGB_PARAMS, eval_metric="logloss")
    model.fit(X_tr, y_tr)
    acc = accuracy_score(y_te, model.predict(X_te))
    joblib.dump(model, os.path.join(MODELS_DIR, f"{name}.pkl"))
    print(f"  ✅ {name}: {round(acc*100,1)}%")

def train_multiclass(name, y):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
    model = xgb.XGBClassifier(
        **XGB_PARAMS,
        objective="multi:softprob",
        num_class=3,
        eval_metric="mlogloss"
    )
    model.fit(X_tr, y_tr)
    acc = accuracy_score(y_te, model.predict(X_te))
    joblib.dump(model, os.path.join(MODELS_DIR, f"{name}.pkl"))
    print(f"  ✅ {name}: {round(acc*100,1)}%")

for name, y in targets.items():
    if name == "winner":
        train_multiclass(name, pd.Series(y))
    else:
        train_binary(name, pd.Series(y).astype(int))

print(f"\n============================================")
print(f"  ✅ {len(targets)} modelos entrenados")
print(f"============================================")
print("  Reinicia el ML Service\n")