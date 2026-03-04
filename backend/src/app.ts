import express from "express";
import cors from "cors";
import matchRoutes from "./routes/Match.routes";
import predictionRoutes from "./routes/prediction.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Football AI Backend Running 🚀" });
});

app.use("/api/matches", matchRoutes);
app.use("/api/predictions", predictionRoutes);

export default app;