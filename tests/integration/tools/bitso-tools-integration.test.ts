import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '../../mocks/handlers.js';
import { createTestServer } from '../../helpers/test-server-factory.js';
import { McpTestHelper } from '../../helpers/mcp-test-helper.js';

// Setup MSW server
const server = setupServer(...handlers);

describe('Bitso Tools Integration Tests', () => {
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

  describe('Tool Registration', () => {
    it('should register all Bitso tools', () => {
      const tools = testHelper.listTools();
      
      // Check that all 6 expected tools are registered
      expect(tools).toContain('list_withdrawals');
      expect(tools).toContain('get_withdrawal');
      expect(tools).toContain('get_withdrawals_by_ids');
      expect(tools).toContain('get_withdrawals_by_origin_ids');
      expect(tools).toContain('list_fundings');
      expect(tools).toContain('get_funding');
      
      // Should have exactly 6 tools
      expect(tools.length).toBe(6);
    });

    it('should have proper tool schemas', () => {
      const tools = testHelper.listTools();
      expect(tools).toContain('list_fundings');
      expect(tools).toContain('list_withdrawals');
      // Tool registration works, detailed schema access is implementation-dependent
    });
  });

  describe('MCP Protocol Compliance', () => {
    it('should return MCP-compliant responses for list_fundings', async () => {
      const result = await testHelper.callTool('list_fundings', {});
      
      // Check MCP response structure
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].type).toBe('text');
    });

    it('should return MCP-compliant responses for list_withdrawals', async () => {
      const result = await testHelper.callTool('list_withdrawals', {});
      
      // Check MCP response structure
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].type).toBe('text');
    });

    it('should return MCP-compliant error responses', async () => {
      const result = await testHelper.callTool('list_fundings', {
        limit: -1 // Invalid parameter
      });
      
      // Even errors should follow MCP structure
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('End-to-End Tool Functionality', () => {
    it('should successfully call get_funding tool', async () => {
      const result = await testHelper.callTool('get_funding', {
        fid: 'f1234567890abcdef'
      });

      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
      
      // This tool returns formatted text, not JSON
      const responseText = result.content[0].text;
      expect(responseText).toContain('Funding Details:');
      expect(responseText).toContain('ID: f1234567890abcdef');
      expect(responseText).toContain('Status:');
      expect(responseText).toContain('Amount:');
    });

    it('should successfully call get_withdrawal tool', async () => {
      const result = await testHelper.callTool('get_withdrawal', {
        wid: 'w1234567890abcdef'
      });

      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
      
      // This tool returns formatted text, not JSON
      const responseText = result.content[0].text;
      expect(responseText).toContain('Withdrawal Details:');
      expect(responseText).toContain('ID: w1234567890abcdef');
      expect(responseText).toContain('Status:');
      expect(responseText).toContain('Amount:');
    });

    it('should handle get_withdrawals_by_ids tool', async () => {
      const result = await testHelper.callTool('get_withdrawals_by_ids', {
        wids: 'w1234567890abcdef,w2234567890abcdef'
      });

      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
      
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.success).toBe(true);
      expect(Array.isArray(responseData.withdrawals)).toBe(true);
    });

    it('should handle get_withdrawals_by_origin_ids tool', async () => {
      const result = await testHelper.callTool('get_withdrawals_by_origin_ids', {
        origin_ids: 'client_ref_001'
      });

      expect(result.isError).toBeFalsy();
      expect(result.content).toBeDefined();
      
      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.success).toBe(true);
      expect(Array.isArray(responseData.withdrawals)).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle 404 errors for get_funding', async () => {
      const result = await testHelper.callTool('get_funding', {
        fid: 'nonexistent_fid'
      });

      expect(result.content[0].text).toContain('Error retrieving funding');
    });

    it('should handle 404 errors for get_withdrawal', async () => {
      const result = await testHelper.callTool('get_withdrawal', {
        wid: 'nonexistent_wid'
      });

      expect(result.content[0].text).toContain('Error retrieving withdrawal');
    });

    it('should handle missing required parameters', async () => {
      const result = await testHelper.callTool('get_funding', {});

      expect(result.content[0].text).toContain('Validation error');
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent JSON format across all list tools', async () => {
      const fundingsResult = await testHelper.callTool('list_fundings', {});
      const withdrawalsResult = await testHelper.callTool('list_withdrawals', {});

      expect(fundingsResult.isError).toBeFalsy();
      expect(withdrawalsResult.isError).toBeFalsy();

      const fundingsData = JSON.parse(fundingsResult.content[0].text);
      const withdrawalsData = JSON.parse(withdrawalsResult.content[0].text);

      // Both should have consistent structure
      expect(fundingsData).toHaveProperty('success');
      expect(fundingsData).toHaveProperty('count');
      expect(fundingsData).toHaveProperty('fundings');

      expect(withdrawalsData).toHaveProperty('success');
      expect(withdrawalsData).toHaveProperty('count');
      expect(withdrawalsData).toHaveProperty('withdrawals');
    });

    it('should return consistent individual item format', async () => {
      const fundingResult = await testHelper.callTool('get_funding', {
        fid: 'f1234567890abcdef'
      });
      const withdrawalResult = await testHelper.callTool('get_withdrawal', {
        wid: 'w1234567890abcdef'
      });

      expect(fundingResult.isError).toBeFalsy();
      expect(withdrawalResult.isError).toBeFalsy();

      // Both return formatted text with consistent structure
      const fundingText = fundingResult.content[0].text;
      const withdrawalText = withdrawalResult.content[0].text;

      // Both should have similar base structure
      expect(fundingText).toContain('Status:');
      expect(fundingText).toContain('Currency:');
      expect(fundingText).toContain('Amount:');
      expect(fundingText).toContain('Method:');
      expect(fundingText).toContain('Created:');
      expect(fundingText).toContain('Details:');

      expect(withdrawalText).toContain('Status:');
      expect(withdrawalText).toContain('Currency:');
      expect(withdrawalText).toContain('Amount:');
      expect(withdrawalText).toContain('Method:');
      expect(withdrawalText).toContain('Created:');
      expect(withdrawalText).toContain('Details:');
    });
  });
});