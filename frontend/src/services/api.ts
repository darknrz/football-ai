import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// ─── Types ────────────────────────────────────────────────────────
export interface League {
  id: number
  name: string
  country: string
}

export interface Team {
  id: number
  name: string
}

export interface MatchStats {
  homeShots: number | null
  awayShots: number | null
  homeShotsOnTarget: number | null
  awayShotsOnTarget: number | null
  homeCorners: number | null
  awayCorners: number | null
  homeYellowCards: number | null
  awayYellowCards: number | null
}

export interface Prediction {
  id: string
  matchId: number
  market: 'winner' | 'over_goals' | 'over_corners' | 'over_cards' | 'btts'
  value: number
  threshold: number | null
  prediction: string
  createdAt: string
}

export interface Match {
  id: number
  apiId: number
  date: string
  status: string
  homeGoals: number | null
  awayGoals: number | null
  homeTeamId: number
  awayTeamId: number
  homeTeamName?: string
  awayTeamName?: string
  season: {
    year: string
    league: League
  }
  stats: MatchStats | null
  predictions: Prediction[]
}

// ─── API calls ───────────────────────────────────────────────────
export const fetchTodayMatches = async (): Promise<Match[]> => {
  const res = await api.get('/matches/today')
  return res.data
}

export const syncMatches = async (): Promise<{ message: string; count: number }> => {
  const res = await api.post('/matches/sync')
  return res.data
}

export const generatePredictions = async (matchId: number): Promise<{ matchId: number; predictions: Prediction[] }> => {
  const res = await api.post(`/predictions/${matchId}`)
  return res.data
}

export const fetchPredictions = async (matchId: number): Promise<Prediction[]> => {
  const res = await api.get(`/predictions/${matchId}`)
  return res.data
}