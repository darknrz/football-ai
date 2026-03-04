from fastapi import FastAPI, HTTPException
import joblib
import numpy as np
import os

app = FastAPI(title="Football ML Service v3")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
models = {}

FEATURE_KEYS = [
    "home_avg_shots", "away_avg_shots",
    "home_avg_shots_on_target", "away_avg_shots_on_target",
    "home_avg_corners", "away_avg_corners",
    "home_avg_cards", "away_avg_cards",
    "home_avg_goals", "away_avg_goals",
    "home_avg_goals_against", "away_avg_goals_against",
]

# Mapeo features del backend → keys del modelo
FEATURE_MAP = {
    "home_avg_shots":           "home_avg_shots",
    "away_avg_shots":           "away_avg_shots",
    "home_avg_shots_on_target": "home_avg_shots_on_target",
    "away_avg_shots_on_target": "away_avg_shots_on_target",
    "home_avg_corners":         "home_avg_corners",
    "away_avg_corners":         "away_avg_corners",
    "home_avg_cards":           "home_avg_cards",
    "away_avg_cards":           "away_avg_cards",
    "home_avg_goals":           "home_avg_goals",
    "away_avg_goals":           "away_avg_goals",
    "home_avg_goals_against":   "home_avg_goals_against",
    "away_avg_goals_against":   "away_avg_goals_against",
}

ALL_MODELS = [
    # Goles
    "goals_home_0_5", "goals_home_1_5", "goals_home_2_5",
    "goals_away_0_5", "goals_away_1_5", "goals_away_2_5",
    "goals_total_0_5", "goals_total_1_5", "goals_total_2_5", "goals_total_3_5", "goals_total_4_5",
    # Corners
    "corners_home_2_5", "corners_home_3_5", "corners_home_4_5", "corners_home_5_5",
    "corners_away_2_5", "corners_away_3_5", "corners_away_4_5", "corners_away_5_5",
    "corners_total_6_5", "corners_total_7_5", "corners_total_8_5",
    "corners_total_9_5", "corners_total_10_5", "corners_total_11_5",
    # Tarjetas
    "cards_home_0_5", "cards_home_1_5", "cards_home_2_5", "cards_home_3_5",
    "cards_away_0_5", "cards_away_1_5", "cards_away_2_5", "cards_away_3_5",
    "cards_total_1_5", "cards_total_2_5", "cards_total_3_5", "cards_total_4_5", "cards_total_5_5",
    # BTTS y Ganador
    "btts", "winner",
]

@app.on_event("startup")
def startup():
    os.makedirs(MODELS_DIR, exist_ok=True)
    loaded = 0
    for name in ALL_MODELS:
        path = os.path.join(MODELS_DIR, f"{name}.pkl")
        if os.path.exists(path):
            models[name] = joblib.load(path)
            loaded += 1
        else:
            print(f"⚠️  Not found: {name}.pkl")
    print(f"✅ {loaded}/{len(ALL_MODELS)} modelos cargados")

@app.get("/")
def root():
    return {"message": "Football ML Service v3 🤖", "models_loaded": len(models)}

@app.post("/predict")
def predict(features: dict):
    if not models:
        raise HTTPException(status_code=503, detail="No models loaded.")

    # Construir vector de features
    X = np.array([[
        features.get("home_avg_shots", 0),
        features.get("away_avg_shots", 0),
        features.get("home_avg_shots_on_target", 0),
        features.get("away_avg_shots_on_target", 0),
        features.get("home_avg_corners", 0),
        features.get("away_avg_corners", 0),
        features.get("home_avg_cards", 0),
        features.get("away_avg_cards", 0),
        features.get("home_avg_goals", 0),
        features.get("away_avg_goals", 0),
        features.get("home_avg_goals_against", 0),
        features.get("away_avg_goals_against", 0),
    ]], dtype=np.float32)

    result = {}

    def prob(name):
        if name in models:
            return round(float(models[name].predict_proba(X)[0][1]), 4)
        return None

    # ─── Goles ────────────────────────────────────────────────────
    result["goals"] = {
        "home": {
            "over_0_5": prob("goals_home_0_5"),
            "over_1_5": prob("goals_home_1_5"),
            "over_2_5": prob("goals_home_2_5"),
        },
        "away": {
            "over_0_5": prob("goals_away_0_5"),
            "over_1_5": prob("goals_away_1_5"),
            "over_2_5": prob("goals_away_2_5"),
        },
        "total": {
            "over_0_5": prob("goals_total_0_5"),
            "over_1_5": prob("goals_total_1_5"),
            "over_2_5": prob("goals_total_2_5"),
            "over_3_5": prob("goals_total_3_5"),
            "over_4_5": prob("goals_total_4_5"),
        },
    }

    # ─── Corners ──────────────────────────────────────────────────
    result["corners"] = {
        "home": {
            "over_2_5": prob("corners_home_2_5"),
            "over_3_5": prob("corners_home_3_5"),
            "over_4_5": prob("corners_home_4_5"),
            "over_5_5": prob("corners_home_5_5"),
        },
        "away": {
            "over_2_5": prob("corners_away_2_5"),
            "over_3_5": prob("corners_away_3_5"),
            "over_4_5": prob("corners_away_4_5"),
            "over_5_5": prob("corners_away_5_5"),
        },
        "total": {
            "over_6_5":  prob("corners_total_6_5"),
            "over_7_5":  prob("corners_total_7_5"),
            "over_8_5":  prob("corners_total_8_5"),
            "over_9_5":  prob("corners_total_9_5"),
            "over_10_5": prob("corners_total_10_5"),
            "over_11_5": prob("corners_total_11_5"),
        },
    }

    # ─── Tarjetas ─────────────────────────────────────────────────
    result["cards"] = {
        "home": {
            "over_0_5": prob("cards_home_0_5"),
            "over_1_5": prob("cards_home_1_5"),
            "over_2_5": prob("cards_home_2_5"),
            "over_3_5": prob("cards_home_3_5"),
        },
        "away": {
            "over_0_5": prob("cards_away_0_5"),
            "over_1_5": prob("cards_away_1_5"),
            "over_2_5": prob("cards_away_2_5"),
            "over_3_5": prob("cards_away_3_5"),
        },
        "total": {
            "over_1_5": prob("cards_total_1_5"),
            "over_2_5": prob("cards_total_2_5"),
            "over_3_5": prob("cards_total_3_5"),
            "over_4_5": prob("cards_total_4_5"),
            "over_5_5": prob("cards_total_5_5"),
        },
    }

    # ─── BTTS ─────────────────────────────────────────────────────
    result["btts"] = prob("btts")

    # ─── Ganador ──────────────────────────────────────────────────
    if "winner" in models:
        proba = models["winner"].predict_proba(X)[0]
        classes = models["winner"].classes_
        class_map = {int(c): round(float(p), 4) for c, p in zip(classes, proba)}
        result["winner"] = {
            "home": class_map.get(1, 0.0),
            "draw": class_map.get(0, 0.0),
            "away": class_map.get(2, 0.0),
        }

    return result

@app.get("/models")
def list_models():
    return {"loaded": list(models.keys()), "total": len(models)}