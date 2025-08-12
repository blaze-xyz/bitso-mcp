# Simple MCP Server Example

This example demonstrates a minimal MCP server implementation using the TypeScript MCP Template. It shows the essential components needed to create a working MCP server.

## Overview

This simple server provides basic tools for:
- Testing connection
- Greeting with customizable messages
- Simple data retrieval simulation

## Quick Start

```bash
# From the template root
cd examples/simple-mcp-server
npm install
npm run build
npm start
```

## File Structure

```
simple-mcp-server/
├── src/
│   ├── index.ts         # Main server entry
│   ├── tools.ts         # Tool implementations
│   └── types.ts         # Type definitions
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## Key Features Demonstrated

### 1. Basic Tool Implementation

```typescript
// Simple tool with no parameters
server.tool("hello", { ... }, async () => {
  return {
    content: [{ type: "text", text: "Hello from MCP!" }]
  };
});
```

### 2. Parameterized Tools

```typescript
// Tool with validated parameters
const GreetSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

server.tool("greet", { ... }, async (params) => {
  const { name } = GreetSchema.parse(params);
  return {
    content: [{ type: "text", text: `Hello, ${name}!` }]
  };
});
```

### 3. Error Handling

```typescript
try {
  const validatedParams = Schema.parse(params);
  // Tool logic
} catch (error) {
  if (error instanceof z.ZodError) {
    // Handle validation errors
  }
  // Return error response
}
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "simple-example": {
      "command": "node",
      "args": ["/path/to/examples/simple-mcp-server/dist/src/index.js"]
    }
  }
}
```

## Available Tools

### `hello`
Simple greeting tool with no parameters.

**Usage**: "Use the hello tool to get a greeting"

### `greet`
Personalized greeting with name parameter.

**Parameters**:
- `name` (string, required): Name to greet

**Usage**: "Use the greet tool with my name 'John'"

### `echo`
Echo back a message with optional repetition.

**Parameters**:
- `message` (string, required): Message to echo
- `times` (number, optional): Number of times to repeat (default: 1)

**Usage**: "Echo 'Hello World' 3 times"

## Learning Points

This example demonstrates:

1. **Minimal setup** for an MCP server
2. **Tool registration** patterns
3. **Parameter validation** with Zod
4. **Error handling** best practices
5. **MCP response format** compliance
6. **TypeScript configuration** for MCP servers

## Next Steps

After understanding this example:

1. Review the full template in the parent directory
2. Explore the comprehensive testing setup
3. Learn about dual transport support
4. Study the production logging system
5. Implement your own tools following these patterns

## Building Your Own Server

Use this as a starting point:

1. Copy this example to a new directory
2. Modify `package.json` with your server details
3. Replace the example tools with your own
4. Add proper API integration if needed
5. Implement comprehensive testing
6. Deploy following the template's best practices