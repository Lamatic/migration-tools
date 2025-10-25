import { Lamatic } from 'lamatic';

// Initialize Lamatic client
const lamaticClient = new Lamatic({
  apiKey: process.env.LAMATIC_API_KEY || '',
  endpoint: process.env.LAMATIC_ENDPOINT || 'https://api.lamatic.ai',
});

export { lamaticClient };
