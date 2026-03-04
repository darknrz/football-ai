import { Router } from "express";
import { fetchTodayMatches, saveMatches } from "../modules/matches/matches.service";

const router = Router();

router.get("/today", async (req, res) => {
  try {
    const matches = await fetchTodayMatches();
    await saveMatches(matches);

    res.json({ message: "Matches saved", count: matches.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching matches" });
  }
});

export default router;