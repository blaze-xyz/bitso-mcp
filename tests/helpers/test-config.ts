import { Config } from '../../src/config.js';

export function createTestConfig(): Config {
  return {
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    apiEndpoint: 'https://stage.bitso.com',
    cacheTtlSeconds: 300,
    timeout: 30000,
    defaultLimit: 25,
    debug: true,
  };
}