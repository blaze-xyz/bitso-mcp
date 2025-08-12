import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpTestHelper } from '../../helpers/mcp-test-helper.js';
import { createTestServer } from '../../helpers/test-server-factory.js';
import { ApiClient } from '../../../src/client.js';

describe('Example Tools Integration Tests', () => {
  let server: McpServer;
  let client: ApiClient;
  let mcpHelper: McpTestHelper;

  beforeEach(() => {
    const testServer = createTestServer();
    server = testServer.server;
    client = testServer.client;
    mcpHelper = new McpTestHelper(server);
  });

  describe('MCP Protocol Compliance', () => {
    it('should register all expected tools', () => {
      const tools = mcpHelper.listTools();
      expect(tools).toContain('hello_world');
      expect(tools).toContain('get_resource');
      expect(tools).toContain('list_resources');
      expect(tools).toContain('search_resources');
      expect(tools).toContain('test_connection');
    });

    it('should provide tool information', () => {
      const toolInfo = mcpHelper.getToolInfo('hello_world');
      expect(toolInfo).toBeDefined();
      expect(toolInfo?.name).toBe('hello_world');
      expect(toolInfo?.description).toBeDefined();
    });
  });

  describe('hello_world tool via MCP protocol', () => {
    it('should return properly formatted MCP response', async () => {
      const result = await mcpHelper.callTool('hello_world');
      
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('Hello from the TypeScript MCP Template');
    });

    it('should work with empty parameters', async () => {
      const result = await mcpHelper.callTool('hello_world', {});
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Hello from the TypeScript MCP Template');
    });
  });

  describe('get_resource tool via MCP protocol', () => {
    it('should return resource details with valid ID', async () => {
      const result = await mcpHelper.callTool('get_resource', { id: '1' });
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Resource Details:');
      expect(result.content[0].text).toContain('ID: 1');
      expect(result.content[0].text).toContain('Name: Example Resource 1');
    });

    it('should handle missing ID parameter', async () => {
      const result = await mcpHelper.callTool('get_resource', {});
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Validation error');
      expect(result.content[0].text).toContain('Required');
    });

    it('should handle empty ID parameter', async () => {
      const result = await mcpHelper.callTool('get_resource', { id: '' });
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Validation error');
    });

    it('should handle non-existent resource ID', async () => {
      const result = await mcpHelper.callTool('get_resource', { id: '999' });
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error retrieving resource');
    });
  });

  describe('list_resources tool via MCP protocol', () => {
    it('should return list of resources', async () => {
      const result = await mcpHelper.callTool('list_resources');
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found');
      expect(result.content[0].text).toContain('resource(s)');
      expect(result.content[0].text).toContain('Example Resource');
    });

    it('should respect limit parameter', async () => {
      const result = await mcpHelper.callTool('list_resources', { limit: 1 });
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 1 resource(s)');
    });

    it('should handle invalid limit parameter', async () => {
      const result = await mcpHelper.callTool('list_resources', { limit: -1 });
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Validation error');
    });

    it('should work with no parameters (default limit)', async () => {
      const result = await mcpHelper.callTool('list_resources', {});
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found');
      expect(result.content[0].text).toContain('resource(s)');
    });
  });

  describe('search_resources tool via MCP protocol', () => {
    it('should find resources by name', async () => {
      const result = await mcpHelper.callTool('search_resources', { query: 'Example' });
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found');
      expect(result.content[0].text).toContain('matching "Example"');
      expect(result.content[0].text).toContain('Example Resource');
    });

    it('should find resources by description', async () => {
      const result = await mcpHelper.callTool('search_resources', { query: 'testing' });
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found');
      expect(result.content[0].text).toContain('matching "testing"');
    });

    it('should handle no matches', async () => {
      const result = await mcpHelper.callTool('search_resources', { query: 'nonexistent12345' });
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('No resources found matching');
    });

    it('should require query parameter', async () => {
      const result = await mcpHelper.callTool('search_resources', {});
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Validation error');
      expect(result.content[0].text).toContain('Required');
    });

    it('should respect limit parameter', async () => {
      const result = await mcpHelper.callTool('search_resources', { 
        query: 'Resource', 
        limit: 1 
      });
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 1 resource(s)');
    });
  });

  describe('test_connection tool via MCP protocol', () => {
    it('should test connection successfully', async () => {
      const result = await mcpHelper.callTool('test_connection');
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('✅ Connection successful');
    });

    it('should work with empty parameters', async () => {
      const result = await mcpHelper.callTool('test_connection', {});
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Connection');
    });
  });

  describe('Error Handling', () => {
    it('should handle tool not found', async () => {
      const result = await mcpHelper.callTool('nonexistent_tool');
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Tool "nonexistent_tool" not found');
      expect(result).toHaveProperty('isError', true);
    });

    it('should maintain MCP response format even for errors', async () => {
      const result = await mcpHelper.callTool('get_resource', { id: '' });
      
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });
  });
});