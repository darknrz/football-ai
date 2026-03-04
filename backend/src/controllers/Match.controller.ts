import { Request, Response } from "express";
import {
  syncTodayMatches,
  syncMatchesByDate,
  getTodayMatchesFromDB,
  getMLDataset,
} from "../services/match.service";

export const syncToday = async (req: Request, res: Response) => {
  try {
    const count = await syncTodayMatches();
    res.json({ message: "Matches synced", count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error syncing matches" });
  }
};

export const syncByDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.params; // YYYY-MM-DD
    const count = await syncMatchesByDate(date);
    res.json({ message: "Matches synced", count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error syncing matches for date" });
  }
};

export const getTodayMatches = async (req: Request, res: Response) => {
  try {
    const matches = await getTodayMatchesFromDB();
    res.json(matches);
  } catch (error) {
    console.error("ERROR DETALLADO:", error);  // ← agrega esto
    res.status(500).json({ error: "Error al obtener coincidencias" });
  }
};

export const getDataset = async (req: Request, res: Response) => {
  try {
    const dataset = await getMLDataset();
    res.json(dataset);
  } catch (error) {
    res.status(500).json({ error: "Error building dataset" });
  }
};