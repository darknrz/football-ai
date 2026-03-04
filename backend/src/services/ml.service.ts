import axios from "axios";

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export interface MLPredictionResult {
  winner?: { home: number; draw: number; away: number };
  over_2_5?: number;
  over_8_5_corners?: number;
  over_3_5_cards?: number;
  btts?: number;
}

export const predictWithML = async (features: Record<string, number>): Promise<MLPredictionResult> => {
  const response = await axios.post(`${ML_URL}/predict`, features);
  return response.data;
};