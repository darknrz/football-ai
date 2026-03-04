import { Router } from "express";
import { buildMatchFeatures } from "../modules/feactures/features.service";
import { predictWithML } from "../services/ml.service";

const router = Router();

router.get("/:matchId", async (req, res) => {
  const matchId = Number(req.params.matchId);

  try {
    const features = await buildMatchFeatures(matchId);

    if (!features) {
      return res.status(400).json({ error: "Not enough data" });
    }

    const prediction = await predictWithML(features);

    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: "Prediction error" });
  }
});

export default router;