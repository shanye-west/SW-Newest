
import express from 'express';
import { db } from '../../lib/db';
import { courses, courseHoles, tournaments } from '../../shared/schema';
import { eq, desc, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const router = express.Router();

// GET /api/courses
router.get('/', async (req, res) => {
  try {
    const allCourses = await db.select().from(courses).orderBy(desc(courses.createdAt));
    res.json(allCourses);
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

    const newCourse = await db.insert(courses).values({
      id: nanoid(),
      name: name.trim(),
      par: parseInt(par),
      rating: parseFloat(rating),
      slope: parseInt(slope),
    }).returning();
    
    res.status(201).json(newCourse[0]);
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

    const updatedCourse = await db.update(courses)
      .set({
        name: name.trim(),
        par: parseInt(par),
        rating: parseFloat(rating),
        slope: parseInt(slope),
      })
      .where(eq(courses.id, id))
      .returning();
    
    if (updatedCourse.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json(updatedCourse[0]);
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
    const tournamentCountResult = await db.select({ count: count() })
      .from(tournaments)
      .where(eq(tournaments.courseId, id));
    
    const tournamentCount = tournamentCountResult[0]?.count || 0;

    if (tournamentCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete course. It is being used by ${tournamentCount} tournament(s). Delete those tournaments first.` 
      });
    }

    // Delete course holes first (they reference the course)
    await db.delete(courseHoles)
      .where(eq(courseHoles.courseId, id));

    // Then delete the course
    const deletedCourse = await db.delete(courses)
      .where(eq(courses.id, id))
      .returning();
      
    if (deletedCourse.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

export default router;
