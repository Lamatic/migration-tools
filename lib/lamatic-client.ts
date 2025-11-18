import { Lamatic } from 'lamatic';

/**
 * Lamatic API client instance.
 * 
 * Initialized with configuration from environment variables:
 * - LAMATIC_API_KEY: API key for authentication (optional)
 * - LAMATIC_ENDPOINT: API endpoint URL (defaults to https://api.lamatic.ai)
 * - LAMATIC_PROJECT_ID: Project identifier (defaults to 'migration-tool')
 * 
 * Used for optional API-based workflow operations (not required for file-based migration).
 */
const lamaticClient = new Lamatic({
  apiKey: process.env.LAMATIC_API_KEY || '',
  endpoint: process.env.LAMATIC_ENDPOINT || 'https://api.lamatic.ai',
  projectId: process.env.LAMATIC_PROJECT_ID || 'migration-tool',
});

export { lamaticClient };
