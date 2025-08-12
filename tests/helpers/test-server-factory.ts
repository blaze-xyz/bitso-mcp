/**
 * Test Server Factory - Creates real MCP server instances for integration testing
 * 
 * This factory creates actual MCP server instances with all tools registered,
 * enabling true integration testing through the MCP protocol.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { BitsoApiClient } from '../../src/client.js'
import { registerBitsoTools } from '../../src/tools/bitso-tools.js'
import { createTestConfig } from './test-config.js'

export function createTestServer(): { server: McpServer, client: BitsoApiClient } {
  // Create test configuration and client
  const config = createTestConfig()
  const client = new BitsoApiClient(config)
  
  // Create MCP server
  const server = new McpServer({
    name: "bitso-mcp-server-test",
    version: "1.0.0-test",
  })
  
  // Register all tool categories (same as production server)
  registerBitsoTools(server, client)
  
  return { server, client }
}