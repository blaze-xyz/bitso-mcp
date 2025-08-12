import { Config } from '../../src/config.js';

export function createTestConfig(): Config {
  return {
    apiKey: 'test-api-key',
    apiEndpoint: 'https://api.example.com',
    cacheTtlSeconds: 300,
    timeout: 30000,
    defaultLimit: 100,
    debug: true,
  };
}