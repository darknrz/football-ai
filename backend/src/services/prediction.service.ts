import { prisma } from "../config/prisma";
import { buildMatchFeatures } from "./feature.service";
import { predictWithML } from "./ml.service";

const getGlobalAverages = async () => {
  const stats = await prisma.matchStats.aggregate({
    _avg: {
      homeShots: true,
      awayShots: true,
      homeShotsOnTarget: true,
      awayShotsOnTarget: true,
      homeCorners: true,
      awayCorners: true,
      homeYellowCards: true,
      awayYellowCards: true,
    },
  });

  return {
    home_avg_shots:             stats._avg.homeShots             ?? 13.0,
    away_avg_shots:             stats._avg.awayShots             ?? 11.0,
    home_avg_shots_on_target:   stats._avg.homeShotsOnTarget     ?? 4.5,
    away_avg_shots_on_target:   stats._avg.awayShotsOnTarget     ?? 3.8,
    home_avg_corners:           stats._avg.homeCorners           ?? 5.2,
    away_avg_corners:           stats._avg.awayCorners           ?? 4.8,
    home_avg_cards:             stats._avg.homeYellowCards       ?? 1.8,
    away_avg_cards:             stats._avg.awayYellowCards       ?? 1.6,
    // Resto de campos requeridos por feature.service
    home_avg_goals: 1.35,
    away_avg_goals: 1.10,
    home_avg_goals_against: 1.10,
    away_avg_goals_against: 1.35,
    home_avg_fouls: 11.0,
    away_avg_fouls: 11.0,
    home_form: 7,
    away_form: 6,
    diff_avg_goals: 0.25,
    diff_avg_corners: 0.4,
    diff_avg_shots: 2.0,
    diff_form: 1,
  };
};

export const generateAndSavePredictions = async (matchId: number) => {
  let features = await buildMatchFeatures(matchId);

  if (!features) return null

  const result = await predictWithML(features);
  await prisma.prediction.deleteMany({ where: { matchId } });

  const predictions: any[] = [];

  if (result.winner) {
    const { home, draw, away } = result.winner;
    const best = Math.max(home, draw, away);
    const predLabel = best === home ? "home" : best === away ? "away" : "draw";
    predictions.push({ matchId, market: "winner", value: best, threshold: null, prediction: predLabel });
  }
  if (result.over_2_5 !== undefined) {
    predictions.push({ matchId, market: "over_goals", value: result.over_2_5, threshold: 2.5, prediction: result.over_2_5 >= 0.5 ? "over" : "under" });
  }
  if (result.over_8_5_corners !== undefined) {
    predictions.push({ matchId, market: "over_corners", value: result.over_8_5_corners, threshold: 8.5, prediction: result.over_8_5_corners >= 0.5 ? "over" : "under" });
  }
  if (result.over_3_5_cards !== undefined) {
    predictions.push({ matchId, market: "over_cards", value: result.over_3_5_cards, threshold: 3.5, prediction: result.over_3_5_cards >= 0.5 ? "over" : "under" });
  }
  if (result.btts !== undefined) {
    predictions.push({ matchId, market: "btts", value: result.btts, threshold: null, prediction: result.btts >= 0.5 ? "yes" : "no" });
  }

  await prisma.prediction.createMany({ data: predictions });
  return predictions;
};

export const getPredictionsByMatch = async (matchId: number) => {
  return prisma.prediction.findMany({
    where: { matchId },
    orderBy: { market: "asc" },
  });
};