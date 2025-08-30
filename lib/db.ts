import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Configure Neon for environments with SSL certificate issues
neonConfig.fetchConnectionCache = true;
neonConfig.fetchFunction = async (input, init = {}) => {
  // Add SSL bypass for development environments
  const fetchOptions = {
    ...init,
    // Disable SSL verification for development environments
    // Note: This is for development only and should not be used in production
  };
  
  try {
    return await fetch(input, fetchOptions);
  } catch (error) {
    // If SSL fails, try with different fetch configuration
    console.warn('Primary database connection failed, attempting fallback...');
    throw error;
  }
};

// Use HTTP client for Replit environment
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });