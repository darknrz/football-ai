// PATCH: Add this to backend/src/services/match.service.ts
// Replace the getTodayMatchesFromDB function with:

export const getTodayMatchesFromDB = async () => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  const matches = await prisma.match.findMany({
    where: { date: { gte: start, lte: end } },
    include: {
      season: { include: { league: true } },
      stats: true,
      predictions: true,
      // Include team via homeTeamId / awayTeamId
    },
    orderBy: { date: 'asc' },
  })

  // Collect unique team IDs
  const teamIds = [...new Set(matches.flatMap(m => [m.homeTeamId, m.awayTeamId]))]
  const teams = await prisma.team.findMany({ where: { id: { in: teamIds } } })
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]))

  // Attach team names to each match
  return matches.map(m => ({
    ...m,
    homeTeamName: teamMap[m.homeTeamId] ?? `Equipo #${m.homeTeamId}`,
    awayTeamName: teamMap[m.awayTeamId] ?? `Equipo #${m.awayTeamId}`,
  }))
}