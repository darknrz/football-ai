import { prisma } from "../config/prisma";
import { buildMatchFeatures } from "./feature.service";
import { predictWithML } from "./ml.service";

export const generateAndSavePredictions = async (matchId: number) => {
  const features = await buildMatchFeatures(matchId);
  if (!features) return null;

  const result = await predictWithML(features);
  await prisma.prediction.deleteMany({ where: { matchId } });

  const predictions: any[] = [];

  // Ganador
  if (result.winner) {
    const { home, draw, away } = result.winner;
    const best = Math.max(home, draw, away);
    const label = best === home ? "home" : best === away ? "away" : "draw";
    predictions.push({
      matchId, market: "winner",
      value: best, threshold: null, prediction: label,
      detail: JSON.stringify(result.winner),
    });
  }

  // Goles
  if (result.goals) {
    predictions.push({
      matchId, market: "goals",
      value: result.goals.total?.over_2_5 ?? 0,
      threshold: 2.5, prediction: (result.goals.total?.over_2_5 ?? 0) >= 0.5 ? "over" : "under",
      detail: JSON.stringify(result.goals),
    });
  }

  // Corners
  if (result.corners) {
    predictions.push({
      matchId, market: "corners",
      value: result.corners.total?.over_8_5 ?? 0,
      threshold: 8.5, prediction: (result.corners.total?.over_8_5 ?? 0) >= 0.5 ? "over" : "under",
      detail: JSON.stringify(result.corners),
    });
  }

  // Tarjetas
  if (result.cards) {
    predictions.push({
      matchId, market: "cards",
      value: result.cards.total?.over_3_5 ?? 0,
      threshold: 3.5, prediction: (result.cards.total?.over_3_5 ?? 0) >= 0.5 ? "over" : "under",
      detail: JSON.stringify(result.cards),
    });
  }

  // BTTS
  if (result.btts !== undefined) {
    predictions.push({
      matchId, market: "btts",
      value: result.btts, threshold: null,
      prediction: result.btts >= 0.5 ? "yes" : "no",
      detail: null,
    });
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