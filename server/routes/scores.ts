
import { Router } from "express";
import { prisma } from "../../lib/db";

const router = Router();

// Save or update a single hole score
router.post("/scores", async (req, res) => {
  try {
    const { entryId, hole, strokes, clientUpdatedAt } = req.body;
    
    if (!entryId || !hole || strokes === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Convert hole to number and validate
    const holeNum = parseInt(hole);
    if (isNaN(holeNum) || holeNum < 1 || holeNum > 18) {
      return res.status(400).json({ error: "Invalid hole number" });
    }

    // Convert strokes to number and validate
    const strokesNum = parseInt(strokes);
    if (isNaN(strokesNum) || strokesNum < 0) {
      return res.status(400).json({ error: "Invalid strokes value" });
    }

    // Check if entry exists
    const entry = await prisma.tournamentEntry.findUnique({
      where: { id: entryId }
    });

    if (!entry) {
      return res.status(404).json({ error: "Tournament entry not found" });
    }

    const clientTime = clientUpdatedAt ? new Date(clientUpdatedAt) : new Date();

    // Check for existing score for Last-Write-Wins conflict resolution
    const existingScore = await prisma.holeScore.findUnique({
      where: {
        entryId_hole: {
          entryId,
          hole: holeNum
        }
      }
    });

    if (existingScore && existingScore.updatedAt > clientTime) {
      // Server has a more recent update, ignore this one
      return res.json({ 
        status: 'ignored', 
        reason: 'stale',
        message: 'Score update ignored due to more recent server data'
      });
    }

    // Upsert the score
    const savedScore = await prisma.holeScore.upsert({
      where: {
        entryId_hole: {
          entryId,
          hole: holeNum
        }
      },
      update: {
        strokes: strokesNum,
        clientUpdatedAt: clientTime,
        updatedAt: new Date()
      },
      create: {
        entryId,
        hole: holeNum,
        strokes: strokesNum,
        clientUpdatedAt: clientTime
      }
    });

    res.json({ 
      status: 'accepted', 
      score: savedScore 
    });

  } catch (error) {
    console.error('Error saving score:', error);
    res.status(500).json({ error: "Failed to save score" });
  }
});

// Get scores for a specific group
router.get("/groups/:groupId/scores", async (req, res) => {
  try {
    const { groupId } = req.params;

    // Get all entries in this group
    const entries = await prisma.tournamentEntry.findMany({
      where: { groupId },
      include: {
        player: true,
        scores: true
      }
    });

    // Transform scores into the expected format
    const scores: Record<string, Record<number, number>> = {};
    
    for (const entry of entries) {
      scores[entry.id] = {};
      for (const score of entry.scores) {
        scores[entry.id][score.hole] = score.strokes;
      }
    }

    res.json({ scores, entries });

  } catch (error) {
    console.error('Error fetching group scores:', error);
    res.status(500).json({ error: "Failed to fetch scores" });
  }
});

export default router;
