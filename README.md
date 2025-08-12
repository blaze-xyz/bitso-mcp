# TypeScript MCP Template

A production-ready TypeScript template for building Model Context Protocol (MCP) servers with comprehensive testing, dual transport support, and development best practices.

## Features

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

### 1. Clone and Setup

```bash
git clone https://github.com/blaze-xyz/typeScript-MCP-template.git my-mcp-server
cd my-mcp-server
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API configuration
```

Required environment variables:
- `API_KEY`: Your API key for the external service

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
    "my-mcp-server": {
      "command": "node",
      "args": ["/path/to/my-mcp-server/dist/src/index.js"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

## Development Guide

### Project Structure

```
src/
├── tools/           # MCP tool implementations
│   └── example-tools.ts
├── utils/           # Shared utilities
│   └── logging.ts   # Project-root-aware logging
├── client.ts        # API client with caching
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

Or create manually following the pattern in `src/tools/example-tools.ts`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const MyToolSchema = z.object({
  param: z.string().min(1, "Parameter is required"),
});

export function registerMyTools(server: McpServer, client: ApiClient): void {
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

### Customizing for Your API

1. Update `src/types.ts` with your API response types
2. Modify `src/client.ts` to implement your API methods
3. Update `tests/mocks/handlers.ts` with your API endpoints
4. Implement your tools in `src/tools/`

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
API_KEY=your-production-api-key
API_ENDPOINT=https://your-api.com
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