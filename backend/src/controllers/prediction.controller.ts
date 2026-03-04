import { Request, Response } from "express";
import { generateAndSavePredictions, getPredictionsByMatch } from "../services/prediction.service";
import { buildMatchFeatures } from "../services/feature.service";

export const predictMatch = async (req: Request, res: Response) => {
  try {
    const matchId = Number(req.params.matchId);
    const predictions = await generateAndSavePredictions(matchId);
    if (predictions === null) {
      return res.status(422).json({ 
        error: "no_data",
        message: "Este equipo no tiene historial. Importa más ligas desde football-data.co.uk"
      });
    }
    res.json({ matchId, predictions });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Prediction failed" });
  }
};

export const getMatchPredictions = async (req: Request, res: Response) => {
  try {
    const matchId = Number(req.params.matchId);
    const predictions = await getPredictionsByMatch(matchId);
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: "Error fetching predictions" });
  }
};

export const getMatchFeatures = async (req: Request, res: Response) => {
  try {
    const matchId = Number(req.params.matchId);
    const features = await buildMatchFeatures(matchId);
    if (!features) return res.status(400).json({ error: "Not enough data" });
    res.json(features);
  } catch (error) {
    res.status(500).json({ error: "Error building features" });
  }
};