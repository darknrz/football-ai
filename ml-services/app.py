from fastapi import FastAPI, HTTPException
import joblib
import numpy as np
import os

app = FastAPI(title="Football ML Service")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
models = {}

# Exactamente las mismas features con las que se entrenó
FEATURE_KEYS = [
    "home_avg_shots",
    "away_avg_shots",
    "home_avg_shots_on_target",
    "away_avg_shots_on_target",
    "home_avg_corners",
    "away_avg_corners",
    "home_avg_cards",
    "away_avg_cards",
]

def load_model(name: str):
    path = os.path.join(MODELS_DIR, f"{name}.pkl")
    if os.path.exists(path):
        models[name] = joblib.load(path)
        print(f"✅ Loaded: {name}")
    else:
        print(f"⚠️  Not found: {name}.pkl — skipping")

@app.on_event("startup")
def startup():
    os.makedirs(MODELS_DIR, exist_ok=True)
    for name in ["goals", "corners", "cards", "btts", "winner"]:
        load_model(name)

@app.get("/")
def root():
    return {"message": "ML Service Running 🤖", "models_loaded": list(models.keys())}

@app.post("/predict")
def predict(features: dict):
    if not models:
        raise HTTPException(status_code=503, detail="No models loaded.")

    # Extraer solo las 8 features que el modelo conoce
    X = np.array([[features.get(k, 0.0) for k in FEATURE_KEYS]], dtype=np.float32)

    result = {}

    if "goals" in models:
        result["over_2_5"] = float(models["goals"].predict_proba(X)[0][1])

    if "corners" in models:
        result["over_8_5_corners"] = float(models["corners"].predict_proba(X)[0][1])

    if "cards" in models:
        result["over_3_5_cards"] = float(models["cards"].predict_proba(X)[0][1])

    if "btts" in models:
        result["btts"] = float(models["btts"].predict_proba(X)[0][1])

    if "winner" in models:
        proba = models["winner"].predict_proba(X)[0]
        classes = models["winner"].classes_
        class_map = {int(c): float(p) for c, p in zip(classes, proba)}
        result["winner"] = {
            "home": class_map.get(1, 0.0),
            "draw": class_map.get(0, 0.0),
            "away": class_map.get(2, 0.0),
        }

    return result

@app.get("/models")
def list_models():
    return {"loaded": list(models.keys())}