#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

// Create MCP server
const server = new McpServer({
  name: "simple-mcp-server",
  version: "1.0.0",
});

// Register all tools
registerTools(server);

// Create stdio transport (for Claude Desktop)
const transport = new StdioServerTransport();

// Connect server to transport
await server.connect(transport);

console.error("Simple MCP Server running on stdio");
console.error("Available tools: hello, greet, echo");