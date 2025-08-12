# Bitso MCP Server

An MCP server for the Bitso API that provides tools to access withdrawals and fundings data. Built with TypeScript, featuring comprehensive testing, dual transport support, and production-ready best practices.

## Features

🏦 **Bitso API Integration**
- Complete Withdrawals API support (list, get by ID, get by multiple IDs, get by origin IDs)
- Complete Fundings API support (list, get by ID)
- Proper authentication with API key/secret and HMAC signature
- Support for all API filtering and pagination parameters

🚀 **Production Ready**
- Dual transport support (stdio for Claude Desktop, HTTP for development)
- Comprehensive error handling and logging
- Type-safe configuration with Zod validation
- Project-root-aware file logging system

🧪 **Comprehensive Testing**
- Two-tier testing strategy (unit + integration tests)
- Real MCP protocol testing (not mocked functions)
- MSW for consistent API mocking
- High test coverage with Vitest

🛠️ **Developer Experience**
- Hot reloading with TypeScript watch mode
- Tool generation script
- ESM support with proper module resolution
- CI/CD pipeline with GitHub Actions

📦 **Best Practices**
- Modular tool organization
- Zod schema validation for all inputs
- Structured logging with file output
- Caching with configurable TTL

## Quick Start

### 1. Setup

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Bitso API credentials
```

Required environment variables:
- `BITSO_API_KEY`: Your Bitso API key
- `BITSO_API_SECRET`: Your Bitso API secret

### 3. Build and Test

```bash
# Build the project
npm run build

# Run tests
npm run test

# Start development server (HTTP mode)
npm run start:http
```

### 4. Add to Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "bitso-mcp-server": {
      "command": "node",
      "args": ["/path/to/bitso-mcp-server/dist/src/index.js"],
      "env": {
        "BITSO_API_KEY": "your-bitso-api-key",
        "BITSO_API_SECRET": "your-bitso-api-secret"
      }
    }
  }
}
```

## Available Tools

The server provides 6 tools to interact with the Bitso API:

### Withdrawals Tools

1. **`list_withdrawals`** - List withdrawals with optional filtering
   - Parameters: `currency`, `limit`, `marker`, `method`, `origin_id`, `status`, `wid`

2. **`get_withdrawal`** - Get specific withdrawal by ID
   - Parameters: `wid` (required)

3. **`get_withdrawals_by_ids`** - Get multiple withdrawals by comma-separated IDs
   - Parameters: `wids` (required, e.g., "wid1,wid2,wid3")

4. **`get_withdrawals_by_origin_ids`** - Get withdrawals by client-supplied origin IDs
   - Parameters: `origin_ids` (required, e.g., "origin1,origin2,origin3")

### Fundings Tools

5. **`list_fundings`** - List fundings with optional filtering
   - Parameters: `limit`, `marker`, `method`, `status`, `fids`

6. **`get_funding`** - Get specific funding by ID
   - Parameters: `fid` (required)

## Development Guide

### Project Structure

```
src/
├── tools/           # MCP tool implementations
│   └── bitso-tools.ts  # Bitso API tools
├── utils/           # Shared utilities
│   └── logging.ts   # Project-root-aware logging
├── client.ts        # Bitso API client with authentication
├── config.ts        # Environment configuration
├── types.ts         # TypeScript type definitions
└── index.ts         # Main server entry point

tests/
├── unit/            # Fast unit tests with MSW mocking
├── integration/     # Real MCP protocol tests
├── helpers/         # Test utilities
│   ├── mcp-test-helper.ts
│   ├── test-server-factory.ts
│   └── test-config.ts
├── mocks/           # MSW request handlers
└── setup.ts         # Test environment setup
```

### Creating New Tools

Use the built-in tool generator:

```bash
npm run build
npm run create-tool
```

Or create manually following the pattern in `src/tools/bitso-tools.ts`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const MyToolSchema = z.object({
  param: z.string().min(1, "Parameter is required"),
});

export function registerMyTools(server: McpServer, client: BitsoApiClient): void {
  server.tool(
    "my_tool",
    {
      description: "Description of what the tool does",
      inputSchema: {
        type: "object",
        properties: {
          param: {
            type: "string",
            description: "Parameter description",
          },
        },
        required: ["param"],
      },
    },
    async (params): Promise<ToolResult> => {
      try {
        const validatedParams = MyToolSchema.parse(params);
        
        // Your tool logic here
        
        return {
          content: [
            {
              type: "text",
              text: "Tool response"
            }
          ]
        };
      } catch (error) {
        // Error handling
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}
```

### Testing Strategy

This template uses a **two-tier testing approach**:

#### Unit Tests (`tests/unit/`)
- Test business logic in isolation
- Mock external APIs using MSW
- Fast execution, run frequently during development
- Focus on data transformations, caching, validation

#### Integration Tests (`tests/integration/`)
- Test through real MCP protocol
- Use actual MCP server instances
- Validate tool registration and MCP compliance
- Ensure proper request/response formatting

```bash
# Run unit tests (fast)
npm run test:unit

# Run integration tests (slower, full MCP protocol)
npm run test:integration

# Run all tests with coverage
npm run test:coverage
```

### Transport Modes

#### Stdio Transport (Production)
Used by Claude Desktop and other MCP clients:

```bash
npm start
# or
node dist/src/index.js
```

#### HTTP Transport (Development)
Useful for debugging and development:

```bash
npm run start:http
# Server available at http://localhost:3000/mcp
```

### Logging and Debugging

The template includes a sophisticated logging system:

- **Debug logs**: Written to `mcp-debug.log` in project root
- **Project-root-aware**: Works from both source and compiled code
- **Structured logging**: JSON formatting for complex data
- **Console output**: Errors also logged to stderr

Check logs during development:

```bash
tail -f mcp-debug.log
```

### Configuration Management

Configuration uses Zod for type-safe validation:

```typescript
// src/config.ts
const ConfigSchema = z.object({
  apiKey: z.string().min(1, 'API_KEY environment variable is required'),
  apiEndpoint: z.string().url().default('https://api.example.com'),
  // ... other config
});
```

Environment variables are validated on startup with clear error messages.

## API Integration

### Client Pattern

The template includes a robust API client pattern:

```typescript
// Automatic caching
const resources = await client.getResources(); // Cached for 5 minutes

// Error handling
try {
  const resource = await client.getResource(id);
} catch (error) {
  // Errors are logged and can be handled
}

// Connection testing
const isHealthy = await client.testConnection();
```

### Bitso API Authentication

The server uses HMAC-SHA256 authentication required by the Bitso API:

```typescript
// Authentication headers are automatically generated
const authHeaders = {
  'key': config.apiKey,
  'signature': hmacSignature,  // Generated using API secret
  'nonce': timestamp
};
```

Each request is signed using:
- API Secret (from environment)
- HTTP method
- Request path
- Request body (if any)
- Current timestamp as nonce

## Deployment

### Building for Production

```bash
npm run build
npm test
```

### CI/CD

The template includes a GitHub Actions workflow (`.github/workflows/ci.yml`):

- **Unit tests**: Fast feedback on basic functionality
- **Integration tests**: Full MCP protocol validation
- **Coverage reporting**: Ensure code quality
- **Build validation**: Verify compilation

### Environment Variables

Production deployment requires:

```bash
BITSO_API_KEY=your-production-api-key
BITSO_API_SECRET=your-production-api-secret
BITSO_API_ENDPOINT=https://api.bitso.com  # Production endpoint
CACHE_TTL_SECONDS=300
TIMEOUT=30000
```

## Best Practices

### Tool Development

1. **Always use Zod schemas** for parameter validation
2. **Return MCP-compliant responses** with `{ content: [...] }` format
3. **Handle errors gracefully** with user-friendly messages
4. **Log extensively** for debugging and monitoring
5. **Test through MCP protocol** using integration tests

### Error Handling

```typescript
// Good: MCP-compliant error response
return {
  content: [
    {
      type: "text",
      text: `Error: ${error.message}`
    }
  ]
};

// Bad: Throwing unhandled errors
throw new Error("Something went wrong");
```

### Performance

- Use caching for expensive API calls
- Implement request timeouts
- Log performance metrics
- Monitor API rate limits

## Troubleshooting

### Common Issues

**Tool not appearing in Claude:**
1. Check build succeeded: `npm run build`
2. Restart Claude Desktop
3. Check `mcp-debug.log` for errors
4. Verify `claude_desktop_config.json` configuration

**Tests failing:**
1. Run unit tests first: `npm run test:unit`
2. Check MSW handlers match your API expectations
3. Verify integration tests use real MCP server instances

**API connection issues:**
1. Verify environment variables are set
2. Test API credentials manually
3. Check network connectivity and firewalls
4. Review API endpoint URLs

### Debug Mode

Enable detailed logging:

```bash
DEBUG=true npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Build successfully: `npm run build`
6. Submit a pull request

## License

MIT License. See [LICENSE](LICENSE) for details.

## Related Resources

- [MCP Official Documentation](https://modelcontextprotocol.io)
- [Claude Desktop Integration Guide](https://docs.anthropic.com/en/docs/build-with-claude/computer-use)
- [Vitest Testing Framework](https://vitest.dev)
- [Zod Schema Validation](https://zod.dev)