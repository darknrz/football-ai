import numpy as np
from app.schemas.prediction_schema import MatchFeatures

FEATURE_ORDER = [
    "home_avg_goals",
    "away_avg_goals",
    "home_avg_goals_against",
    "away_avg_goals_against",
    "home_avg_corners",
    "away_avg_corners",
    "home_avg_shots",
    "away_avg_shots",
    "home_avg_shots_on_target",
    "away_avg_shots_on_target",
    "home_avg_cards",
    "away_avg_cards",
    "home_avg_fouls",
    "away_avg_fouls",
    "home_form",
    "away_form",
    "diff_avg_goals",
    "diff_avg_corners",
    "diff_avg_shots",
    "diff_form",
]

def features_to_array(features: MatchFeatures) -> np.ndarray:
    values = [getattr(features, f) for f in FEATURE_ORDER]
    return np.array([values], dtype=np.float32)