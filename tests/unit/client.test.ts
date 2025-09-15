import { describe, it, expect, beforeEach } from 'vitest';
import { BitsoApiClient } from '../../src/client.js';
import { Config } from '../../src/config.js';

describe('BitsoApiClient', () => {
  let client: BitsoApiClient;
  let mockConfig: Config;

  beforeEach(() => {
    mockConfig = {
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      apiEndpoint: 'https://api.bitso.com',
      timeout: 10000,
      cacheTtlSeconds: 300,
    };

    client = new BitsoApiClient(mockConfig);
  });

  describe('testConnection', () => {
    it('should return true when connection succeeds', async () => {
      // MSW will mock the API response to return success
      const result = await client.testConnection();
      expect(result).toBe(true);
    });
  });
});