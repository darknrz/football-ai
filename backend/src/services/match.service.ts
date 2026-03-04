import axios from "axios";
import { prisma } from "../config/prisma";

const API_URL = process.env.FOOTBALL_API_URL!;
const API_KEY = process.env.FOOTBALL_API_KEY!;

// ─── Sync ────────────────────────────────────────────────────────
export const syncTodayMatches = async () => {
  const today = new Date().toISOString().split("T")[0];
  const response = await axios.get(`${API_URL}/fixtures`, {
    params: { date: today },
    headers: { "x-apisports-key": API_KEY },
  });
  const matches = response.data.response;
  await saveMatches(matches);
  return matches.length;
};

export const syncMatchesByDate = async (date: string) => {
  const response = await axios.get(`${API_URL}/fixtures`, {
    params: { date },
    headers: { "x-apisports-key": API_KEY },
  });
  const matches = response.data.response;
  await saveMatches(matches);
  return matches.length;
};

// ─── Get today from DB ───────────────────────────────────────────
export const getTodayMatchesFromDB = async () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const matches = await prisma.match.findMany({
    where: { date: { gte: start, lte: end } },
    include: {
      season: { include: { league: true } },
      stats: true,
      predictions: true,
    },
    orderBy: { date: "asc" },
  });

  const teamIds = [...new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
  const teams = await prisma.team.findMany({ where: { id: { in: teamIds } } });
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t.name]));

  return matches.map((m) => ({
    ...m,
    homeTeamName: teamMap[m.homeTeamId] ?? `Equipo #${m.homeTeamId}`,
    awayTeamName: teamMap[m.awayTeamId] ?? `Equipo #${m.awayTeamId}`,
  }));
};

// ─── ML Dataset ──────────────────────────────────────────────────
export const getMLDataset = async () => {
  const matches = await prisma.match.findMany({
    where: { status: "FT", stats: { isNot: null } },
    include: { stats: true },
  });

  return matches.map((m) => {
    const totalGoals = (m.homeGoals ?? 0) + (m.awayGoals ?? 0);
    const totalCorners = (m.stats?.homeCorners ?? 0) + (m.stats?.awayCorners ?? 0);
    const totalCards = (m.stats?.homeYellowCards ?? 0) + (m.stats?.awayYellowCards ?? 0);
    const btts = (m.homeGoals ?? 0) > 0 && (m.awayGoals ?? 0) > 0 ? 1 : 0;
    let winner = 0;
    if ((m.homeGoals ?? 0) > (m.awayGoals ?? 0)) winner = 1;
    else if ((m.homeGoals ?? 0) < (m.awayGoals ?? 0)) winner = 2;

    return {
      match_id: m.id,
      home_shots: m.stats?.homeShots ?? 0,
      away_shots: m.stats?.awayShots ?? 0,
      home_shots_on_target: m.stats?.homeShotsOnTarget ?? 0,
      away_shots_on_target: m.stats?.awayShotsOnTarget ?? 0,
      home_corners: m.stats?.homeCorners ?? 0,
      away_corners: m.stats?.awayCorners ?? 0,
      home_cards: m.stats?.homeYellowCards ?? 0,
      away_cards: m.stats?.awayYellowCards ?? 0,
      total_goals: totalGoals,
      total_corners: totalCorners,
      total_cards: totalCards,
      over_2_5: totalGoals > 2.5 ? 1 : 0,
      over_8_5_corners: totalCorners > 8.5 ? 1 : 0,
      over_3_5_cards: totalCards > 3.5 ? 1 : 0,
      btts,
      winner,
    };
  });
};

// ─── Internal save ───────────────────────────────────────────────
const saveMatches = async (matches: any[]) => {
  for (const m of matches) {
    const league = await prisma.league.upsert({
      where: { apiId: m.league.id },
      update: {},
      create: { apiId: m.league.id, name: m.league.name, country: m.league.country },
    });

    let season = await prisma.season.findFirst({
      where: { year: String(m.league.season), leagueId: league.id },
    });
    if (!season) {
      season = await prisma.season.create({
        data: { year: String(m.league.season), leagueId: league.id },
      });
    }

    const homeTeam = await prisma.team.upsert({
      where: { apiId: m.teams.home.id },
      update: {},
      create: { apiId: m.teams.home.id, name: m.teams.home.name },
    });

    const awayTeam = await prisma.team.upsert({
      where: { apiId: m.teams.away.id },
      update: {},
      create: { apiId: m.teams.away.id, name: m.teams.away.name },
    });

    await prisma.match.upsert({
      where: { apiId: m.fixture.id },
      update: { status: m.fixture.status.short, homeGoals: m.goals.home, awayGoals: m.goals.away },
      create: {
        apiId: m.fixture.id,
        seasonId: season.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        date: new Date(m.fixture.date),
        status: m.fixture.status.short,
        homeGoals: m.goals.home,
        awayGoals: m.goals.away,
      },
    });
  }
};