import express from 'express';
import { db } from '../../lib/db';
import { players, entries } from '../../shared/schema';
import { eq, desc, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const router = express.Router();

// GET /api/players
router.get('/', async (req, res) => {
  try {
    const allPlayers = await db.select().from(players).orderBy(desc(players.createdAt));
    res.json(allPlayers);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// POST /api/players
router.post('/', async (req, res) => {
  try {
    const { name, email, handicapIndex } = req.body;
    
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const newPlayer = await db.insert(players).values({
      id: nanoid(),
      name: name.trim(),
      email: email?.trim() || null,
      handicapIndex: handicapIndex ? parseFloat(handicapIndex) : null
    }).returning();
    
    res.status(201).json(newPlayer[0]);
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// PUT /api/players/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, handicapIndex } = req.body;
    
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const updatedPlayer = await db.update(players)
      .set({
        name: name.trim(),
        email: email?.trim() || null,
        handicapIndex: handicapIndex ? parseFloat(handicapIndex) : null
      })
      .where(eq(players.id, id))
      .returning();
    
    if (updatedPlayer.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json(updatedPlayer[0]);
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// DELETE /api/players/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if player has entries in any tournaments
    const entryCountResult = await db.select({ count: count() })
      .from(entries)
      .where(eq(entries.playerId, id));
    
    const entryCount = entryCountResult[0]?.count || 0;

    if (entryCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete player. They are entered in ${entryCount} tournament(s). Remove them from tournaments first.` 
      });
    }
    
    const deletedPlayer = await db.delete(players)
      .where(eq(players.id, id))
      .returning();
      
    if (deletedPlayer.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting player:', error);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

export default router;