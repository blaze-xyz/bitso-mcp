import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BitsoApiClient } from '../../src/client.js';
import { createTestConfig } from '../helpers/test-config.js';
import fs from 'fs';
import path from 'path';
import { registerBitsoTools } from '../../src/tools/bitso-tools.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpTestHelper } from '../helpers/mcp-test-helper.js';

describe('export_fundings tool', () => {
  let client: BitsoApiClient;
  let server: McpServer;
  let helper: McpTestHelper;
  let testFilePath: string;

  beforeEach(() => {
    const config = createTestConfig();
    client = new BitsoApiClient(config);
    
    server = new McpServer({
      name: "test-server",
      version: "1.0.0-test",
    });
    
    registerBitsoTools(server, client);
    helper = new McpTestHelper(server);
    
    testFilePath = path.join('/tmp', `test-fundings-${Date.now()}.csv`);
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('should export fundings to CSV file', async () => {
    const result = await helper.callTool('export_fundings', {
      filepath: testFilePath
    });

    expect(result.content[0].text).toContain('Successfully exported');
    expect(fs.existsSync(testFilePath)).toBe(true);
    
    const csvContent = fs.readFileSync(testFilePath, 'utf8');
    const lines = csvContent.split('\n');
    
    expect(lines[0]).toBe('method,currency,gross,fee,net amount,timestamp,datetime');
    
    expect(lines[1]).toContain('Circle Transfer,usd,198.00,0,198.00');
    expect(lines[2]).toContain('Circle Transfer,usd,104.10,0,104.10');
  });

  it('should handle validation errors', async () => {
    const result = await helper.callTool('export_fundings', {});

    expect(result.content[0].text).toContain('Validation error');
    expect(result.content[0].text).toContain('filepath');
  });
});
