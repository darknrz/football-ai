import { Router } from "express";
import { syncToday, syncByDate, getTodayMatches, getDataset } from "../controllers/match.controller";

const router = Router();

// GET /matches/today  → fetch from DB
router.get("/today", getTodayMatches);

// POST /matches/sync  → pull from football API and save
router.post("/sync", syncToday);

// POST /matches/sync/:date  → sync a specific date (YYYY-MM-DD)
router.post("/sync/:date", syncByDate);

// GET /matches/dataset  → ML training dataset
router.get("/dataset", getDataset);

export default router;