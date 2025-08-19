#!/usr/bin/env tsx
/**
 * Backfill CourseHole data for existing courses
 * Creates 18 holes with default pars and placeholder stroke indexes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default par values - typical 18-hole layout
const DEFAULT_PARS = [4, 4, 4, 3, 4, 4, 5, 3, 4, 4, 4, 3, 4, 5, 4, 4, 3, 4];

async function backfillHoles() {
  console.log('🏌️ Starting CourseHole backfill...');

  const courses = await prisma.course.findMany({
    include: {
      holes: true,
    },
  });

  console.log(`Found ${courses.length} courses`);

  for (const course of courses) {
    if (course.holes.length === 0) {
      console.log(`Creating holes for course: ${course.name}`);

      const holeData = Array.from({ length: 18 }, (_, i) => {
        const holeNumber = i + 1;
        return {
          courseId: course.id,
          hole: holeNumber,
          par: DEFAULT_PARS[i] || 4, // Fallback to par 4
          strokeIndex: holeNumber, // 1..18 placeholder (organizer will edit)
        };
      });

      await prisma.courseHole.createMany({
        data: holeData,
      });

      console.log(`✅ Created 18 holes for ${course.name}`);
    } else {
      console.log(`⏭️ Course ${course.name} already has ${course.holes.length} holes`);
    }
  }

  console.log('🏁 Backfill complete!');
}

backfillHoles()
  .catch((e) => {
    console.error('❌ Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });