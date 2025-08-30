import { db } from '../lib/db';
import { players, courses } from '../shared/schema';
import { desc } from 'drizzle-orm';

async function testDrizzleQueries() {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    console.log('Testing Drizzle ORM queries...');
    
    // Test players query
    console.log('\n1. Testing players query:');
    const playersResult = await db.select().from(players).orderBy(desc(players.createdAt));
    console.log('Players result:', playersResult);
    console.log('Players count:', playersResult.length);
    
    // Test courses query  
    console.log('\n2. Testing courses query:');
    const coursesResult = await db.select().from(courses).orderBy(desc(courses.createdAt));
    console.log('Courses result:', coursesResult);
    console.log('Courses count:', coursesResult.length);
    
  } catch (error) {
    console.error('Drizzle query error:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testDrizzleQueries();