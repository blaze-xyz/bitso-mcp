import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestServer } from '../helpers/test-server-factory.js';
import { McpTestHelper } from '../helpers/mcp-test-helper.js';
import fs from 'fs';
import path from 'path';

describe('export_fundings integration', () => {
  let helper: McpTestHelper;
  let testFilePath: string;

  beforeEach(() => {
    const { server } = createTestServer();
    helper = new McpTestHelper(server);
    testFilePath = path.join('/tmp', `integration-fundings-${Date.now()}.csv`);
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('should be registered as a tool', () => {
    const tools = helper.listTools();
    expect(tools).toContain('export_fundings');
  });

  it('should have correct tool info', () => {
    const toolInfo = helper.getToolInfo('export_fundings');
    expect(toolInfo?.name).toBe('export_fundings');
    expect(toolInfo).toBeDefined();
  });

  it('should export via MCP protocol', async () => {
    const result = await helper.callTool('export_fundings', {
      filepath: testFilePath
    });

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Successfully exported');
    expect(fs.existsSync(testFilePath)).toBe(true);
  });
});
