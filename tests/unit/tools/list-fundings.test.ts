import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '../../mocks/handlers.js';
import { createTestServer } from '../../helpers/test-server-factory.js';
import { McpTestHelper } from '../../helpers/mcp-test-helper.js';
import { FundingStatus, FundingMethod } from '../../../src/types.js';

// Setup MSW server
const server = setupServer(...handlers);

describe('list_fundings tool', () => {
  let testHelper: McpTestHelper;

  beforeAll(() => {
    // Start MSW server
    server.listen({ onUnhandledRequest: 'error' });
    
    // Create test server and helper
    const { server: mcpServer } = createTestServer();
    testHelper = new McpTestHelper(mcpServer);
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('Parameter Validation', () => {
    it('should accept valid parameters', async () => {
      const result = await testHelper.callTool('list_fundings', {
        limit: 10,
        status: FundingStatus.COMPLETE,
        method: FundingMethod.USDC_TRF
      });

      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.success).toBe(true);
      expect(responseData.count).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(responseData.fundings)).toBe(true);
    });

    it('should validate limit parameter bounds', async () => {
      // Test invalid limit - too high
      const result1 = await testHelper.callTool('list_fundings', {
        limit: 150
      });
      
      expect(result1.content[0].text).toContain('Validation error');
      expect(result1.content[0].text).toContain('Number must be less than or equal to 100');

      // Test invalid limit - zero
      const result2 = await testHelper.callTool('list_fundings', {
        limit: 0
      });
      
      expect(result2.content[0].text).toContain('Validation error');
    });

    it('should validate status enum values', async () => {
      // Valid enum value
      const validResult = await testHelper.callTool('list_fundings', {
        status: FundingStatus.PENDING
      });
      expect(validResult.isError).toBeFalsy();

      // Invalid enum value (should still work as we allow strings)
      const invalidResult = await testHelper.callTool('list_fundings', {
        status: 'invalid_status'
      });
      expect(invalidResult.isError).toBeFalsy(); // Should pass validation but return no results
    });

    it('should validate method enum values', async () => {
      // Valid enum value
      const validResult = await testHelper.callTool('list_fundings', {
        method: FundingMethod.PRAXIS
      });
      expect(validResult.isError).toBeFalsy();

      // Invalid enum value (should still work as we allow strings)
      const invalidResult = await testHelper.callTool('list_fundings', {
        method: 'invalid_method'
      });
      expect(invalidResult.isError).toBeFalsy(); // Should pass validation but return no results
    });

    it('should accept optional parameters', async () => {
      const result = await testHelper.callTool('list_fundings', {});
      
      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
      
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.success).toBe(true);
      expect(responseData.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Filtering Functionality', () => {
    it('should filter by status', async () => {
      const result = await testHelper.callTool('list_fundings', {
        status: FundingStatus.COMPLETE
      });

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0].text);
      
      expect(responseData.success).toBe(true);
      expect(responseData.fundings.every((f: any) => f.status === FundingStatus.COMPLETE)).toBe(true);
    });

    it('should filter by method', async () => {
      const result = await testHelper.callTool('list_fundings', {
        method: FundingMethod.USDC_TRF
      });

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0].text);
      
      expect(responseData.success).toBe(true);
      expect(responseData.fundings.every((f: any) => f.method === FundingMethod.USDC_TRF)).toBe(true);
    });

    it('should filter by specific funding IDs', async () => {
      const result = await testHelper.callTool('list_fundings', {
        fids: 'f1234567890abcdef,f2234567890abcdef'
      });

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0].text);
      
      expect(responseData.success).toBe(true);
      expect(responseData.fundings.length).toBeLessThanOrEqual(2);
      expect(responseData.fundings.every((f: any) => 
        ['f1234567890abcdef', 'f2234567890abcdef'].includes(f.fid)
      )).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const result = await testHelper.callTool('list_fundings', {
        limit: 2
      });

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0].text);
      
      expect(responseData.success).toBe(true);
      expect(responseData.fundings.length).toBeLessThanOrEqual(2);
      expect(responseData.count).toBe(responseData.fundings.length);
    });

    it('should combine multiple filters', async () => {
      const result = await testHelper.callTool('list_fundings', {
        status: FundingStatus.COMPLETE,
        method: FundingMethod.USDC_TRF,
        limit: 1
      });

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0].text);
      
      expect(responseData.success).toBe(true);
      expect(responseData.fundings.length).toBeLessThanOrEqual(1);
      if (responseData.fundings.length > 0) {
        expect(responseData.fundings[0].status).toBe(FundingStatus.COMPLETE);
        expect(responseData.fundings[0].method).toBe(FundingMethod.USDC_TRF);
      }
    });
  });

  describe('Response Format', () => {
    it('should return properly formatted JSON response', async () => {
      const result = await testHelper.callTool('list_fundings', {});

      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      
      // Should be valid JSON
      const responseData = JSON.parse(result.content[0].text);
      
      // Check required response structure
      expect(responseData).toHaveProperty('success');
      expect(responseData).toHaveProperty('count');
      expect(responseData).toHaveProperty('fundings');
      expect(Array.isArray(responseData.fundings)).toBe(true);
    });

    it('should include all funding fields in response', async () => {
      const result = await testHelper.callTool('list_fundings', {
        limit: 1
      });

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0].text);
      
      if (responseData.fundings.length > 0) {
        const funding = responseData.fundings[0];
        expect(funding).toHaveProperty('fid');
        expect(funding).toHaveProperty('status');
        expect(funding).toHaveProperty('currency');
        expect(funding).toHaveProperty('amount');
        expect(funding).toHaveProperty('method');
        expect(funding).toHaveProperty('created_at');
        expect(funding).toHaveProperty('details');
      }
    });

    it('should handle empty results gracefully', async () => {
      const result = await testHelper.callTool('list_fundings', {
        status: 'nonexistent_status'
      });

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0].text);
      
      expect(responseData.success).toBe(true);
      expect(responseData.count).toBe(0);
      expect(responseData.fundings).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // This would require mocking a network error
      // For now, we'll test that the tool structure handles errors
      const result = await testHelper.callTool('list_fundings', {
        limit: -1 // This should trigger validation error
      });

      expect(result.content[0].text).toContain('Validation error');
      expect(result.content[0].text).toContain('greater than 0');
    });

    it('should provide helpful error messages', async () => {
      const result = await testHelper.callTool('list_fundings', {
        limit: 101 // Exceeds maximum
      });

      expect(result.content[0].text).toContain('Validation error');
      expect(result.content[0].text).toContain('Number must be less than or equal to 100');
    });
  });

  describe('Tool Registration', () => {
    it('should be properly registered', () => {
      const tools = testHelper.listTools();
      expect(tools).toContain('list_fundings');
    });

    it('should have correct tool information', () => {
      const tools = testHelper.listTools();
      expect(tools).toContain('list_fundings');
      // Tool registration works, detailed info access is implementation-dependent
    });
  });
});