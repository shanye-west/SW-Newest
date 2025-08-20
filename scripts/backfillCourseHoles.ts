/**
 * Backfill CourseHole data for existing courses
 */

import { prisma } from '../lib/db';

// Using existing db instance

const DEFAULT_PARS = [4,4,4,3,4,4,5,3,4, 4,4,3,4,5,4,4,3,4];
const DEFAULT_STROKE_INDEXES = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];

async function backfillCourseHoles() {
  try {
    console.log('Starting course holes backfill...');
    
    // Get all courses
    const courses = await prisma.course.findMany({
      include: {
        holes: true
      }
    });

    for (const course of courses) {
      // Skip if course already has holes
      if (course.holes && course.holes.length > 0) {
        console.log(`Course "${course.name}" already has ${course.holes.length} holes, skipping`);
        continue;
      }

      console.log(`Backfilling holes for course "${course.name}"`);

      // Create 18 holes with default values
      const holesData = Array.from({ length: 18 }, (_, i) => ({
        courseId: course.id,
        hole: i + 1,
        par: DEFAULT_PARS[i] || 4,
        strokeIndex: DEFAULT_STROKE_INDEXES[i]
      }));

      await prisma.courseHole.createMany({
        data: holesData
      });

      console.log(`Created ${holesData.length} holes for course "${course.name}"`);
    }

    console.log('Backfill completed successfully');
  } catch (error) {
    console.error('Error during backfill:', error);
    throw error;
  }
}

// Run the backfill
backfillCourseHoles()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });