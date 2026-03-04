import joblib
import numpy as np

# Cargar modelos (cuando los entrenemos los pondremos aquí)
winner_model = None
goals_model = joblib.load("models/goals.pkl")
corners_model = None

def load_models():
    global winner_model, goals_model, corners_model
    winner_model = joblib.load("models/winner.pkl")
    goals_model = joblib.load("models/goals.pkl")
    corners_model = joblib.load("models/corners.pkl")

def predict_match(features: dict):
    X = np.array([list(features.values())])

    result = {}

    if winner_model:
        result["winner"] = float(winner_model.predict_proba(X)[0][1])

    if goals_model:
        result["over_2_5"] = float(goals_model.predict_proba(X)[0][1])

    if corners_model:
        result["over_8_corners"] = float(corners_model.predict_proba(X)[0][1])

    return result
load_models()