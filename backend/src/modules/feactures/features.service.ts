import { prisma } from "../config/prisma";

const getLastMatches = async (teamId: number, date: Date, limit = 5) => {
  return prisma.match.findMany({
    where: {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      date: { lt: date },
      status: "FT",
    },
    include: { stats: true },
    orderBy: { date: "desc" },
    take: limit,
  });
};

const calculateTeamAverages = async (teamId: number, date: Date) => {
  const matches = await getLastMatches(teamId, date, 5);
  if (matches.length === 0) return null;

  let goals = 0, goalsAgainst = 0, corners = 0, yellowCards = 0;
  let shots = 0, shotsOnTarget = 0, fouls = 0, points = 0;

  for (const m of matches) {
    const isHome = m.homeTeamId === teamId;
    const teamGoals = isHome ? m.homeGoals ?? 0 : m.awayGoals ?? 0;
    const oppGoals = isHome ? m.awayGoals ?? 0 : m.homeGoals ?? 0;

    goals += teamGoals;
    goalsAgainst += oppGoals;

    if (m.stats) {
      corners += isHome ? m.stats.homeCorners ?? 0 : m.stats.awayCorners ?? 0;
      yellowCards += isHome ? m.stats.homeYellowCards ?? 0 : m.stats.awayYellowCards ?? 0;
      shots += isHome ? m.stats.homeShots ?? 0 : m.stats.awayShots ?? 0;
      shotsOnTarget += isHome ? m.stats.homeShotsOnTarget ?? 0 : m.stats.awayShotsOnTarget ?? 0;
      fouls += isHome ? m.stats.homeFouls ?? 0 : m.stats.awayFouls ?? 0;
    }

    if (teamGoals > oppGoals) points += 3;
    else if (teamGoals === oppGoals) points += 1;
  }

  const n = matches.length;
  return {
    avgGoals: goals / n,
    avgGoalsAgainst: goalsAgainst / n,
    avgCorners: corners / n,
    avgYellowCards: yellowCards / n,
    avgShots: shots / n,
    avgShotsOnTarget: shotsOnTarget / n,
    avgFouls: fouls / n,
    formPoints: points,
    matchesPlayed: n,
  };
};

export const buildMatchFeatures = async (matchId: number) => {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("Match not found");

  const [homeStats, awayStats] = await Promise.all([
    calculateTeamAverages(match.homeTeamId, match.date),
    calculateTeamAverages(match.awayTeamId, match.date),
  ]);

  if (!homeStats || !awayStats) return null;

  return {
    home_avg_goals: homeStats.avgGoals,
    away_avg_goals: awayStats.avgGoals,
    home_avg_goals_against: homeStats.avgGoalsAgainst,
    away_avg_goals_against: awayStats.avgGoalsAgainst,
    home_avg_corners: homeStats.avgCorners,
    away_avg_corners: awayStats.avgCorners,
    home_avg_shots: homeStats.avgShots,
    away_avg_shots: awayStats.avgShots,
    home_avg_shots_on_target: homeStats.avgShotsOnTarget,
    away_avg_shots_on_target: awayStats.avgShotsOnTarget,
    home_avg_cards: homeStats.avgYellowCards,
    away_avg_cards: awayStats.avgYellowCards,
    home_avg_fouls: homeStats.avgFouls,
    away_avg_fouls: awayStats.avgFouls,
    home_form: homeStats.formPoints,
    away_form: awayStats.formPoints,
    diff_avg_goals: homeStats.avgGoals - awayStats.avgGoals,
    diff_avg_corners: homeStats.avgCorners - awayStats.avgCorners,
    diff_avg_shots: homeStats.avgShots - awayStats.avgShots,
    diff_form: homeStats.formPoints - awayStats.formPoints,
  };
};