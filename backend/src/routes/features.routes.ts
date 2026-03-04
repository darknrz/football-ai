import { Router } from "express";
import { buildMatchFeatures } from "../modules/feactures/features.service";

const router = Router();

router.get("/:matchId", async (req, res) => {
  const matchId = Number(req.params.matchId);

  try {
    const features = await buildMatchFeatures(matchId);
    res.json(features);
  } catch (error) {
    res.status(500).json({ error: "Error building features" });
  }
});

export default router;