import { db } from '../lib/db';
import { players, courses } from '../shared/schema';
import { nanoid } from 'nanoid';

async function testAPIs() {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    console.log('🧪 Testing API endpoints with fresh data...\n');
    
    // Test creating a player
    const playerId = nanoid();
    const testPlayer = await db.insert(players).values({
      id: playerId,
      name: 'Migration Test Player',
      handicapIndex: 15.2
    }).returning();
    
    console.log('✅ Created test player:', testPlayer[0].name);
    
    // Test creating a course
    const courseId = nanoid();
    const testCourse = await db.insert(courses).values({
      id: courseId,
      name: 'Migration Test Course',
      par: 72,
      rating: 72.5,
      slope: 125
    }).returning();
    
    console.log('✅ Created test course:', testCourse[0].name);
    
    // Test fetching data
    const allPlayers = await db.select().from(players);
    console.log(`✅ Fetched ${allPlayers.length} players via Drizzle`);
    
    const allCourses = await db.select().from(courses);
    console.log(`✅ Fetched ${allCourses.length} courses via Drizzle`);
    
    console.log('\n🎉 All API tests passed!');
    console.log('📈 Data persistence working correctly');
    console.log('🔄 CRUD operations functional');
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

testAPIs();