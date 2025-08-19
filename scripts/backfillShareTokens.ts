import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate a base62 token of specified length
 */
function makeShareToken(length: number = 12): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Backfill share tokens for tournaments that don't have them
 */
async function backfillShareTokens() {
  console.log('Starting shareToken backfill...');
  
  try {
    // Find tournaments without share tokens
    const tournamentsWithoutTokens = await prisma.tournament.findMany({
      where: {
        shareToken: null
      },
      select: {
        id: true,
        name: true
      }
    });
    
    if (tournamentsWithoutTokens.length === 0) {
      console.log('No tournaments need shareToken backfill.');
      return;
    }
    
    console.log(`Found ${tournamentsWithoutTokens.length} tournaments without shareTokens.`);
    
    // Generate unique tokens for each tournament
    for (const tournament of tournamentsWithoutTokens) {
      let token: string;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;
      
      // Ensure token uniqueness
      while (!isUnique && attempts < maxAttempts) {
        token = makeShareToken(12);
        
        const existing = await prisma.tournament.findUnique({
          where: { shareToken: token }
        });
        
        if (!existing) {
          isUnique = true;
          
          await prisma.tournament.update({
            where: { id: tournament.id },
            data: { shareToken: token }
          });
          
          console.log(`✓ ${tournament.name}: ${token}`);
        }
        
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        console.error(`✗ Failed to generate unique token for ${tournament.name} after ${maxAttempts} attempts`);
      }
    }
    
    console.log('✅ ShareToken backfill completed successfully!');
  } catch (error) {
    console.error('❌ Error during shareToken backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backfillShareTokens();
}

export { makeShareToken, backfillShareTokens };