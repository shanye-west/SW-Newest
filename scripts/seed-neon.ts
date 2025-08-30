import { db } from '../lib/db';
import { players, courses, courseHoles } from '../shared/schema';
import { nanoid } from 'nanoid';

async function seedDatabase() {
  try {
    console.log('Seeding Neon database...');
    
    // Insert a test player
    const player = await db.insert(players).values({
      id: nanoid(),
      name: 'Test Player',
      email: 'test@example.com',
      handicapIndex: 10.5,
    }).returning();
    
    console.log('Created player:', player);
    
    // Insert a test course
    const course = await db.insert(courses).values({
      id: nanoid(),
      name: 'Test Course',
      par: 72,
      slope: 128,
      rating: 72.0,
    }).returning();
    
    console.log('Created course:', course);
    
    // Insert course holes
    const holes = [];
    for (let i = 1; i <= 18; i++) {
      holes.push({
        id: nanoid(),
        courseId: course[0].id,
        hole: i,
        par: i % 3 === 0 ? 5 : i % 4 === 0 ? 3 : 4, // Mix of par 3, 4, 5
        strokeIndex: i,
      });
    }
    
    await db.insert(courseHoles).values(holes);
    console.log('Created 18 course holes');
    
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  }
}

seedDatabase();