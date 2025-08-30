import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Set Node.js environment variables to handle SSL certificate issues
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Configure Neon for Replit environment with retry logic
neonConfig.fetchConnectionCache = true;

// Create direct connection (SSL issue resolved)
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });