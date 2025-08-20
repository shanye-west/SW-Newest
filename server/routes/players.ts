import express from 'express';
import { prisma } from '../../lib/db';

const router = express.Router();

// GET /api/players
router.get('/', async (req, res) => {
  try {
    const players = await prisma.player.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(players);
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

    const player = await prisma.player.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        handicapIndex: handicapIndex ? parseFloat(handicapIndex) : null
      }
    });
    
    res.status(201).json(player);
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

    const player = await prisma.player.update({
      where: { id },
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        handicapIndex: handicapIndex ? parseFloat(handicapIndex) : null
      }
    });
    
    res.json(player);
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
    const entryCount = await prisma.entry.count({
      where: { playerId: id },
    });

    if (entryCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete player. They are entered in ${entryCount} tournament(s). Remove them from tournaments first.` 
      });
    }
    
    await prisma.player.delete({
      where: { id }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting player:', error);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

export default router;