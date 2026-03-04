import { Router } from "express";
import { prisma } from "../config/prisma";

const router = Router();

router.get("/dataset", async (req, res) => {
  const matches = await prisma.match.findMany({
    where: {
      status: "FT",
      stats: { isNot: null }
    },
    include: {
      stats: true
    }
  });

  const dataset = matches.map((m) => {
    const totalGoals = (m.homeGoals ?? 0) + (m.awayGoals ?? 0);
    const totalCorners =
      (m.stats?.homeCorners ?? 0) +
      (m.stats?.awayCorners ?? 0);

    return {
      total_goals: totalGoals,
      over_2_5: totalGoals > 2 ? 1 : 0,
      total_corners: totalCorners,
      over_8_corners: totalCorners > 8 ? 1 : 0,
      home_shots: m.stats?.homeShots ?? 0,
      away_shots: m.stats?.awayShots ?? 0,
      home_corners: m.stats?.homeCorners ?? 0,
      away_corners: m.stats?.awayCorners ?? 0,
      home_cards: m.stats?.homeYellowCards ?? 0,
      away_cards: m.stats?.awayYellowCards ?? 0
    };
  });

  res.json(dataset);
});

export default router;