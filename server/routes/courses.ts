
import express from 'express';
import { prisma } from '../../lib/db';

const router = express.Router();

// GET /api/courses
router.get('/', async (req, res) => {
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

// POST /api/courses
router.post('/', async (req, res) => {
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
        slope: parseInt(slope),
      }
    });
    
    res.status(201).json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// PUT /api/courses/:id
router.put('/:id', async (req, res) => {
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
        slope: parseInt(slope),
      }
    });
    
    res.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// DELETE /api/courses/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if course is used by any tournaments
    const tournamentCount = await prisma.tournament.count({
      where: { courseId: id },
    });

    if (tournamentCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete course. It is being used by ${tournamentCount} tournament(s). Delete those tournaments first.` 
      });
    }

    // Delete course holes first (they reference the course)
    await prisma.courseHole.deleteMany({
      where: { courseId: id },
    });

    // Then delete the course
    await prisma.course.delete({
      where: { id },
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

export default router;
