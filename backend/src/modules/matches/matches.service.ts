import axios from "axios";
import { prisma } from "../../config/prisma";

const API_URL = process.env.FOOTBALL_API_URL!;
const API_KEY = process.env.FOOTBALL_API_KEY!;

export const fetchTodayMatches = async () => {
  const today = new Date().toISOString().split("T")[0];
  const response = await axios.get(`${API_URL}/fixtures`, {
    params: { date: today },
    headers: { "x-apisports-key": API_KEY },
  });
  return response.data.response;
};

export const saveMatches = async (matches: any[]) => {
  for (const m of matches) {
    // Liga
    const league = await prisma.league.upsert({
      where: { apiId: m.league.id },
      update: {},
      create: {
        apiId: m.league.id,
        name: m.league.name,
        country: m.league.country,
      },
    });

    // Temporada — usa findFirst + create para evitar el bug del upsert compuesto
    let season = await prisma.season.findFirst({
      where: {
        year: String(m.league.season),
        leagueId: league.id,
      },
    });

    if (!season) {
      season = await prisma.season.create({
        data: {
          year: String(m.league.season),
          leagueId: league.id,
        },
      });
    }

    // Equipos
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

    // Partido
    await prisma.match.upsert({
      where: { apiId: m.fixture.id },
      update: {
        status: m.fixture.status.short,
        homeGoals: m.goals.home,
        awayGoals: m.goals.away,
      },
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

    // Stats solo si terminó
    if (m.fixture.status.short === "FT") {
      try {
        const statsRes = await fetchMatchStats(m.fixture.id);
        const homeStats = statsRes.find((s: any) => s.team.id === m.teams.home.id);
        const awayStats = statsRes.find((s: any) => s.team.id === m.teams.away.id);

        if (homeStats && awayStats) {
          const getStat = (stats: any, type: string) =>
            stats.statistics.find((x: any) => x.type === type)?.value ?? null;

          const match = await prisma.match.findUnique({ where: { apiId: m.fixture.id } });
          if (match) {
            await prisma.matchStats.upsert({
              where: { matchId: match.id },
              update: {},
              create: {
                matchId: match.id,
                homeShots: getStat(homeStats, "Total Shots"),
                awayShots: getStat(awayStats, "Total Shots"),
                homeShotsOnTarget: getStat(homeStats, "Shots on Goal"),
                awayShotsOnTarget: getStat(awayStats, "Shots on Goal"),
                homeCorners: getStat(homeStats, "Corner Kicks"),
                awayCorners: getStat(awayStats, "Corner Kicks"),
                homeFouls: getStat(homeStats, "Fouls"),
                awayFouls: getStat(awayStats, "Fouls"),
                homeYellowCards: getStat(homeStats, "Yellow Cards"),
                awayYellowCards: getStat(awayStats, "Yellow Cards"),
              },
            });
          }
        }
      } catch (e) {
        console.warn(`Stats fetch failed for fixture ${m.fixture.id}`);
      }
    }
  }
};

export const fetchMatchStats = async (fixtureId: number) => {
  const response = await axios.get(`${API_URL}/fixtures/statistics`, {
    params: { fixture: fixtureId },
    headers: { "x-apisports-key": API_KEY },
  });
  return response.data.response;
};