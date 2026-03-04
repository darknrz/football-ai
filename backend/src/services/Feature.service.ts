import { prisma } from "../config/prisma";

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fc|cf|sc|ac|bc|fk|sk|if|bk|ik|united|city|sporting|club|de|del|la|los)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const TEAM_ALIASES: Record<string, string> = {
  "vallecano": "rayo vallecano",
  "ath madrid": "atletico de madrid",
  "atletico madrid": "atletico de madrid",
  "man utd": "manchester united",
  "man united": "manchester united",
  "man city": "manchester city",
  "tottenham": "tottenham hotspur",
  "spurs": "tottenham hotspur",
  "wolves": "wolverhampton wanderers",
  "forest": "nottingham forest",
  "inter": "inter milan",
  "milan": "ac milan",
  "psg": "paris saint germain",
  "paris sg": "paris saint germain",
  "nottm forest": "nottingham forest",
  "notts forest": "nottingham forest",
  "newcastle": "newcastle united",  
  "sheffield utd": "sheffield united",
  "sheffield weds": "sheffield wednesday",
  "west brom": "west bromwich albion",
  "brighton": "brighton hove albion",
  "luton": "luton town",
  "burnley": "burnley",
  "brentford": "brentford",
  
};

function canonicalName(name: string): string {
  const n = normalizeName(name);
  return TEAM_ALIASES[n] ?? n;
}

async function findTeamByName(name: string): Promise<number | null> {
  const canonical = canonicalName(name);
  const teams = await prisma.team.findMany({ select: { id: true, name: true } });
  for (const team of teams) {
    if (canonicalName(team.name) === canonical) return team.id;
  }
  const partial = await prisma.team.findFirst({
    where: { name: { contains: name.split(" ")[0], mode: "insensitive" } },
    select: { id: true },
  });
  return partial?.id ?? null;
}

const getLastMatches = async (teamId: number, date: Date, limit = 5) => {
  return prisma.match.findMany({
    where: {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      date: { lt: date },
      status: "FT",
      stats: { isNot: null },
    },
    include: { stats: true },
    orderBy: { date: "desc" },
    take: limit,
  });
};

const calcAvg = (matches: any[], teamId: number) => {
  if (matches.length === 0) return null;
  let goals = 0, goalsAgainst = 0, shots = 0, shotsOnTarget = 0;
  let corners = 0, cards = 0, fouls = 0, form = 0;
  for (const m of matches) {
    const isHome = m.homeTeamId === teamId;
    goals         += isHome ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
    goalsAgainst  += isHome ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
    shots         += isHome ? (m.stats?.homeShots ?? 0) : (m.stats?.awayShots ?? 0);
    shotsOnTarget += isHome ? (m.stats?.homeShotsOnTarget ?? 0) : (m.stats?.awayShotsOnTarget ?? 0);
    corners       += isHome ? (m.stats?.homeCorners ?? 0) : (m.stats?.awayCorners ?? 0);
    cards         += isHome ? (m.stats?.homeYellowCards ?? 0) : (m.stats?.awayYellowCards ?? 0);
    fouls         += isHome ? (m.stats?.homeFouls ?? 0) : (m.stats?.awayFouls ?? 0);
    const gf = isHome ? (m.homeGoals ?? 0) : (m.awayGoals ?? 0);
    const ga = isHome ? (m.awayGoals ?? 0) : (m.homeGoals ?? 0);
    form += gf > ga ? 3 : gf === ga ? 1 : 0;
  }
  const n = matches.length;
  return {
    avg_goals: goals / n, avg_goals_against: goalsAgainst / n,
    avg_shots: shots / n, avg_shots_on_target: shotsOnTarget / n,
    avg_corners: corners / n, avg_cards: cards / n,
    avg_fouls: fouls / n, form,
  };
};

export const buildMatchFeatures = async (matchId: number) => {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return null;

  const homeTeam = await prisma.team.findUnique({ where: { id: match.homeTeamId } });
  const awayTeam = await prisma.team.findUnique({ where: { id: match.awayTeamId } });

  let homeMatches = await getLastMatches(match.homeTeamId, match.date);
  let awayMatches = await getLastMatches(match.awayTeamId, match.date);

  if (homeMatches.length < 2 && homeTeam) {
    const altId = await findTeamByName(homeTeam.name);
    if (altId && altId !== match.homeTeamId) {
      const alt = await getLastMatches(altId, match.date);
      if (alt.length > homeMatches.length) homeMatches = alt;
    }
  }

  if (awayMatches.length < 2 && awayTeam) {
    const altId = await findTeamByName(awayTeam.name);
    if (altId && altId !== match.awayTeamId) {
      const alt = await getLastMatches(altId, match.date);
      if (alt.length > awayMatches.length) awayMatches = alt;
    }
  }

  const homeAvg = calcAvg(homeMatches, match.homeTeamId);
  const awayAvg = calcAvg(awayMatches, match.awayTeamId);
  if (!homeAvg || !awayAvg) return null;

  return {
    home_avg_goals: homeAvg.avg_goals, away_avg_goals: awayAvg.avg_goals,
    home_avg_goals_against: homeAvg.avg_goals_against, away_avg_goals_against: awayAvg.avg_goals_against,
    home_avg_shots: homeAvg.avg_shots, away_avg_shots: awayAvg.avg_shots,
    home_avg_shots_on_target: homeAvg.avg_shots_on_target, away_avg_shots_on_target: awayAvg.avg_shots_on_target,
    home_avg_corners: homeAvg.avg_corners, away_avg_corners: awayAvg.avg_corners,
    home_avg_cards: homeAvg.avg_cards, away_avg_cards: awayAvg.avg_cards,
    home_avg_fouls: homeAvg.avg_fouls, away_avg_fouls: awayAvg.avg_fouls,
    home_form: homeAvg.form, away_form: awayAvg.form,
    diff_avg_goals: homeAvg.avg_goals - awayAvg.avg_goals,
    diff_avg_corners: homeAvg.avg_corners - awayAvg.avg_corners,
    diff_avg_shots: homeAvg.avg_shots - awayAvg.avg_shots,
    diff_form: homeAvg.form - awayAvg.form,
  };
};