import { db } from '../lib/db';

async function debugTables() {
  try {
    console.log('Debugging database tables...');
    
    // Set SSL bypass
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    // Check what tables exist
    console.log('1. Checking available tables:');
    const tables = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('Tables:', tables.rows.map(r => r.table_name));
    
    // Check players table structure
    console.log('\n2. Checking players table structure:');
    const playersStructure = await db.execute(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'players'
      ORDER BY ordinal_position;
    `);
    console.log('Players columns:', playersStructure.rows);
    
    // Try a simple count query
    console.log('\n3. Testing count query:');
    const count = await db.execute('SELECT COUNT(*) as count FROM players');
    console.log('Players count:', count.rows[0]);
    
    // Try to insert a test record
    console.log('\n4. Testing insert:');
    const insertResult = await db.execute(`
      INSERT INTO players (id, name, handicap_index) 
      VALUES ('test-123', 'Test Player', 10.5) 
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      RETURNING *;
    `);
    console.log('Insert result:', insertResult.rows[0]);
    
    // Test select with Drizzle
    console.log('\n5. Testing Drizzle select:');
    const drizzleSelect = await db.execute('SELECT * FROM players LIMIT 5');
    console.log('Drizzle raw select:', drizzleSelect.rows);
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugTables();