import { db } from '../lib/db';

async function testConnection() {
  try {
    console.log('Testing Neon database connection...');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('DATABASE_URL prefix:', process.env.DATABASE_URL?.substring(0, 20));
    
    // Try a simple query
    const result = await db.execute('SELECT 1 as test');
    console.log('Database connection successful!', result);
    
    // Try to select from players table
    const playersResult = await db.execute('SELECT count(*) as count FROM players');
    console.log('Players table exists, count:', playersResult);
    
  } catch (error) {
    console.error('Database connection failed:', error);
    
    // Get more detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

testConnection();