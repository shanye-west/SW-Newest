import { Router } from "express";
import { computeResults } from "../services/results";

const router = Router();

router.get("/tournaments/:id/results", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "missing id" });
    const data = await computeResults(id);
    res.json(data);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "failed to compute results" });
  }
});

export default router;
