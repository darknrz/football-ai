import axios from "axios";

const API_URL = process.env.FOOTBALL_API_URL!;
const API_KEY = process.env.FOOTBALL_API_KEY!;

const headers = { "x-apisports-key": API_KEY };

export const fetchTodayFixtures = async () => {
  const today = new Date().toISOString().split("T")[0];
  const res = await axios.get(`${API_URL}/fixtures`, {
    params: { date: today },
    headers,
  });
  return res.data.response;
};

export const fetchFixturesByDate = async (date: string) => {
  const res = await axios.get(`${API_URL}/fixtures`, {
    params: { date },
    headers,
  });
  return res.data.response;
};

export const fetchFixtureStats = async (fixtureId: number) => {
  const res = await axios.get(`${API_URL}/fixtures/statistics`, {
    params: { fixture: fixtureId },
    headers,
  });
  return res.data.response;
};

export const getStat = (teamStats: any, type: string): number | null => {
  const found = teamStats?.statistics?.find((x: any) => x.type === type);
  const val = found?.value;
  if (val === null || val === undefined) return null;
  return Number(val);
};