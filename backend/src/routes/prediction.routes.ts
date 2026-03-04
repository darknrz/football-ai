import { Router } from "express";
import {
  predictMatch,
  getMatchPredictions,
  getMatchFeatures,
} from "../controllers/prediction.controller";

const router = Router();

// POST /predictions/:matchId  → generate + save predictions
router.post("/:matchId", predictMatch);

// GET /predictions/:matchId   → get saved predictions
router.get("/:matchId", getMatchPredictions);

// GET /predictions/:matchId/features  → inspect features
router.get("/:matchId/features", getMatchFeatures);

export default router;