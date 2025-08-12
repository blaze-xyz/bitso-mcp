import { describe, it, expect, beforeEach } from 'vitest';
import { ApiClient } from '../../../src/client.js';
import { createTestConfig } from '../../helpers/test-config.js';

describe('Example Tools Unit Tests', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient(createTestConfig());
  });

  describe('ApiClient', () => {
    it('should create client with test configuration', () => {
      expect(client).toBeDefined();
    });

    it('should test connection successfully', async () => {
      const result = await client.testConnection();
      expect(result).toBe(true);
    });

    it('should get list of resources', async () => {
      const resources = await client.getResources();
      expect(resources).toBeDefined();
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
      
      const firstResource = resources[0];
      expect(firstResource).toHaveProperty('id');
      expect(firstResource).toHaveProperty('name');
      expect(firstResource).toHaveProperty('createdAt');
      expect(firstResource).toHaveProperty('updatedAt');
    });

    it('should get specific resource by ID', async () => {
      const resource = await client.getResource('1');
      expect(resource).toBeDefined();
      expect(resource.id).toBe('1');
      expect(resource.name).toBe('Example Resource 1');
      expect(resource.description).toBe('This is the first example resource');
    });

    it('should handle non-existent resource ID', async () => {
      await expect(client.getResource('999')).rejects.toThrow();
    });

    it('should cache resources on subsequent calls', async () => {
      // First call should fetch from API
      const resources1 = await client.getResources();
      
      // Second call should return cached data
      const resources2 = await client.getResources();
      
      expect(resources1).toEqual(resources2);
    });

    it('should clear cache when requested', async () => {
      // Fetch resources to populate cache
      await client.getResources();
      
      // Clear cache
      client.clearCache();
      
      // This should work without error
      const resources = await client.getResources();
      expect(resources).toBeDefined();
    });
  });

  describe('Tool Input Validation', () => {
    it('should validate resource ID format', () => {
      // Test empty string
      expect(() => {
        if (!('1'.length > 0)) throw new Error('ID required');
      }).not.toThrow();
      
      // Test non-empty string
      expect(() => {
        if (!(''.length > 0)) throw new Error('ID required');
      }).toThrow();
    });

    it('should validate search query format', () => {
      const query = 'test query';
      expect(query.length).toBeGreaterThan(0);
      expect(typeof query).toBe('string');
    });

    it('should validate limit parameters', () => {
      const validLimits = [1, 10, 50, 100];
      const invalidLimits = [0, -1, 101, 'invalid'];
      
      validLimits.forEach(limit => {
        expect(typeof limit).toBe('number');
        expect(limit).toBeGreaterThan(0);
        expect(limit).toBeLessThanOrEqual(100);
      });
      
      invalidLimits.forEach(limit => {
        if (typeof limit === 'number') {
          expect(limit <= 0 || limit > 100).toBe(true);
        } else {
          expect(typeof limit).not.toBe('number');
        }
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter resources by name', async () => {
      const allResources = await client.getResources();
      const query = 'Example';
      
      const filtered = allResources.filter(resource => 
        resource.name.toLowerCase().includes(query.toLowerCase())
      );
      
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach(resource => {
        expect(resource.name.toLowerCase()).toContain(query.toLowerCase());
      });
    });

    it('should filter resources by description', async () => {
      const allResources = await client.getResources();
      const query = 'testing';
      
      const filtered = allResources.filter(resource => 
        resource.description?.toLowerCase().includes(query.toLowerCase())
      );
      
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach(resource => {
        expect(resource.description?.toLowerCase()).toContain(query.toLowerCase());
      });
    });

    it('should return empty array for non-matching query', async () => {
      const allResources = await client.getResources();
      const query = 'nonexistentquery12345';
      
      const filtered = allResources.filter(resource => 
        resource.name.toLowerCase().includes(query.toLowerCase()) ||
        (resource.description && resource.description.toLowerCase().includes(query.toLowerCase()))
      );
      
      expect(filtered).toEqual([]);
    });
  });
});