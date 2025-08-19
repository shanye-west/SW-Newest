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

  // Courses API routes
  app.get('/api/courses', async (req, res) => {
    try {
      const courses = await prisma.course.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      res.status(500).json({ error: 'Failed to fetch courses' });
    }
  });

  app.post('/api/courses', async (req, res) => {
    try {
      const { name, par, rating, slope } = req.body;
      
      if (!name?.trim() || !par || !rating || !slope) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const course = await prisma.course.create({
        data: {
          name: name.trim(),
          par: parseInt(par),
          rating: parseFloat(rating),
          slope: parseInt(slope)
        }
      });
      
      res.status(201).json(course);
    } catch (error) {
      console.error('Error creating course:', error);
      res.status(500).json({ error: 'Failed to create course' });
    }
  });

  app.put('/api/courses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, par, rating, slope } = req.body;
      
      if (!name?.trim() || !par || !rating || !slope) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const course = await prisma.course.update({
        where: { id },
        data: {
          name: name.trim(),
          par: parseInt(par),
          rating: parseFloat(rating),
          slope: parseInt(slope)
        }
      });
      
      res.json(course);
    } catch (error) {
      console.error('Error updating course:', error);
      res.status(500).json({ error: 'Failed to update course' });
    }
  });

  app.delete('/api/courses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      await prisma.course.delete({
        where: { id }
      });
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting course:', error);
      res.status(500).json({ error: 'Failed to delete course' });
    }
  });

  // Tournaments API routes
  app.get('/api/tournaments', async (req, res) => {
    try {
      const tournaments = await prisma.tournament.findMany({
        include: { course: { select: { name: true } } },
        orderBy: { date: 'desc' }
      });
      res.json(tournaments);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      res.status(500).json({ error: 'Failed to fetch tournaments' });
    }
  });

  app.post('/api/tournaments', async (req, res) => {
    try {
      const { name, date, courseId, netAllowance, status } = req.body;
      
      if (!name?.trim() || !date || !courseId) {
        return res.status(400).json({ error: 'Name, date, and course are required' });
      }

      const tournament = await prisma.tournament.create({
        data: {
          name: name.trim(),
          date: new Date(date),
          courseId,
          netAllowance: netAllowance || 100,
          status: status || 'upcoming'
        },
        include: { course: { select: { name: true } } }
      });
      
      res.status(201).json(tournament);
    } catch (error) {
      console.error('Error creating tournament:', error);
      res.status(500).json({ error: 'Failed to create tournament' });
    }
  });

  app.put('/api/tournaments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, date, courseId, netAllowance, status } = req.body;
      
      if (!name?.trim() || !date || !courseId) {
        return res.status(400).json({ error: 'Name, date, and course are required' });
      }

      const tournament = await prisma.tournament.update({
        where: { id },
        data: {
          name: name.trim(),
          date: new Date(date),
          courseId,
          netAllowance: netAllowance || 100,
          status: status || 'upcoming'
        },
        include: { course: { select: { name: true } } }
      });
      
      res.json(tournament);
    } catch (error) {
      console.error('Error updating tournament:', error);
      res.status(500).json({ error: 'Failed to update tournament' });
    }
  });

  app.delete('/api/tournaments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      await prisma.tournament.delete({
        where: { id }
      });
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      res.status(500).json({ error: 'Failed to delete tournament' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
