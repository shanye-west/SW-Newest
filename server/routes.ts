import type { Express } from "express";
import { createServer, type Server } from "http";
import { prisma } from "../lib/db";

export async function registerRoutes(app: Express): Promise<Server> {
  // Players API routes
  app.get('/api/players', async (req, res) => {
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

  app.post('/api/players', async (req, res) => {
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

  app.put('/api/players/:id', async (req, res) => {
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

  app.delete('/api/players/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      await prisma.player.delete({
        where: { id }
      });
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting player:', error);
      res.status(500).json({ error: 'Failed to delete player' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
