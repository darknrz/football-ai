"""
Train all XGBoost models for football predictions.
Run from ml-service/ directory:
    python trainer.py

Requires the backend to be running at localhost:4000.
"""

import requests
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

# ─── Config ────────────────────────────────────────────────────────────────────
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "app", "model")
os.makedirs(MODELS_DIR, exist_ok=True)

FEATURE_COLS = [
    "home_avg_goals", "away_avg_goals",
    "home_avg_goals_against", "away_avg_goals_against",
    "home_avg_corners", "away_avg_corners",
    "home_avg_shots", "away_avg_shots",
    "home_avg_shots_on_target", "away_avg_shots_on_target",
    "home_avg_cards", "away_avg_cards",
    "home_avg_fouls", "away_avg_fouls",
    "home_form", "away_form",
    "diff_avg_goals", "diff_avg_corners",
    "diff_avg_shots", "diff_form",
]

XGB_PARAMS = dict(n_estimators=300, max_depth=4, learning_rate=0.05,
                  subsample=0.8, colsample_bytree=0.8, use_label_encoder=False,
                  eval_metric="logloss", random_state=42)

# ─── Load dataset ──────────────────────────────────────────────────────────────
print("📥 Fetching dataset from backend...")
response = requests.get(f"{BACKEND_URL}/api/matches/dataset")
response.raise_for_status()
raw = response.json()
data = pd.DataFrame(raw)
print(f"   Total finished matches: {len(data)}")

# Keep only rows where all feature columns exist via the feature endpoint
# The dataset endpoint returns raw stats, so we need to build features separately.
# Alternative: fetch features per match and join with targets.

# For training we use the raw stats as proxy features (fast path)
# When you have enough data, switch to using buildMatchFeatures per match.

RAW_FEATURE_COLS = [
    "home_shots", "away_shots",
    "home_shots_on_target", "away_shots_on_target",
    "home_corners", "away_corners",
    "home_cards", "away_cards",
]

available_cols = [c for c in RAW_FEATURE_COLS if c in data.columns]
X = data[available_cols].fillna(0)

MIN_SAMPLES = 50
if len(X) < MIN_SAMPLES:
    print(f"❌ Not enough data: {len(X)} matches (need at least {MIN_SAMPLES}). Collect more data first.")
    exit(1)

def train_binary(target: str, model_name: str, label: str):
    if target not in data.columns:
        print(f"⚠️  Skipping {label}: target column '{target}' not in dataset")
        return
    y = data[target]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = xgb.XGBClassifier(**XGB_PARAMS)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"\n📊 {label}")
    print(f"   Accuracy: {acc:.3f}")
    print(classification_report(y_test, preds, zero_division=0))
    path = os.path.join(MODELS_DIR, f"{model_name}.pkl")
    joblib.dump(model, path)
    print(f"   ✅ Saved → {path}")

def train_multiclass(target: str, model_name: str, label: str):
    if target not in data.columns:
        print(f"⚠️  Skipping {label}: target column '{target}' not in dataset")
        return
    y = data[target]
    params = {**XGB_PARAMS, "objective": "multi:softprob", "num_class": 3}
    params.pop("eval_metric")
    params["eval_metric"] = "mlogloss"
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = xgb.XGBClassifier(**params)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"\n📊 {label}")
    print(f"   Accuracy: {acc:.3f}")
    print(classification_report(y_test, preds, zero_division=0))
    path = os.path.join(MODELS_DIR, f"{model_name}.pkl")
    joblib.dump(model, path)
    print(f"   ✅ Saved → {path}")

print("\n🏋️  Training models...\n")
train_binary("over_2_5", "goals", "Over 2.5 Goals")
train_binary("over_8_5_corners", "corners", "Over 8.5 Corners")
train_binary("over_3_5_cards", "cards", "Over 3.5 Cards")
train_binary("btts", "btts", "BTTS (Both Teams Score)")
train_multiclass("winner", "winner", "Match Winner (0=draw, 1=home, 2=away)")

print("\n🎉 All models trained and saved to app/model/")