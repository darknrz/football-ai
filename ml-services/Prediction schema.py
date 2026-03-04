from pydantic import BaseModel

class MatchFeatures(BaseModel):
    home_avg_goals: float
    away_avg_goals: float
    home_avg_goals_against: float
    away_avg_goals_against: float
    home_avg_corners: float
    away_avg_corners: float
    home_avg_shots: float
    away_avg_shots: float
    home_avg_shots_on_target: float
    away_avg_shots_on_target: float
    home_avg_cards: float
    away_avg_cards: float
    home_avg_fouls: float
    away_avg_fouls: float
    home_form: float
    away_form: float
    diff_avg_goals: float
    diff_avg_corners: float
    diff_avg_shots: float
    diff_form: float