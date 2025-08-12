# Development Best Practices

This document outlines development best practices, patterns, and guidelines for building MCP servers with this TypeScript template.

## Project Architecture

### Modular Design Principles

The template follows a modular architecture that separates concerns:

```
src/
├── tools/           # Tool implementations (business logic)
├── utils/           # Shared utilities (logging, helpers)
├── client.ts        # API client (external integrations)
├── config.ts        # Configuration management
├── types.ts         # Type definitions
└── index.ts         # Main server entry point
```

### Key Design Decisions

1. **ESM Module System**: Modern JavaScript modules with proper import/export
2. **Type Safety**: Comprehensive TypeScript with strict mode enabled
3. **Configuration Validation**: Runtime validation with Zod schemas
4. **Error Boundaries**: Structured error handling at every layer
5. **Logging Strategy**: Project-root-aware file logging with structured data

## Development Workflow

### Setting Up Development Environment

```bash
# Initial setup
npm install
cp .env.example .env
# Edit .env with your configuration

# Development mode (with file watching)
npm run dev

# HTTP server for testing
npm run start:http
```

### Code Development Cycle

1. **Make changes** to TypeScript files
2. **Build project**: `npm run build` (or use watch mode)
3. **Test changes**: `npm test` (unit and integration)
4. **Debug**: Check `mcp-debug.log` for detailed logging
5. **Test in Claude**: Restart Claude Desktop after rebuilding

### Hot Reloading

Use TypeScript watch mode for faster development:

```bash
# Terminal 1: Watch TypeScript compilation
npm run dev

# Terminal 2: Run HTTP server for testing
npm run start:http

# Terminal 3: Watch test results
npm run test:watch
```

## Tool Development Patterns

### Tool Structure Template

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../client.js";
import { ToolResult } from "../types.js";
import { createLogger } from "../utils/logging.js";

const logToFile = createLogger(import.meta.url, 'TOOLS');

// 1. Define Zod schema for validation
const MyToolSchema = z.object({
  requiredParam: z.string().min(1, "Required parameter is missing"),
  optionalParam: z.number().optional(),
});

export function registerMyTools(server: McpServer, client: ApiClient): void {
  server.tool(
    "my_tool",
    {
      // 2. Clear description for Claude
      description: "Detailed description of what this tool does and when to use it",
      
      // 3. JSON Schema for MCP protocol
      inputSchema: {
        type: "object",
        properties: {
          requiredParam: {
            type: "string",
            description: "Description of the required parameter",
          },
          optionalParam: {
            type: "number",
            description: "Description of the optional parameter",
          },
        },
        required: ["requiredParam"],
      },
    },
    async (params): Promise<ToolResult> => {
      try {
        // 4. Validate input with Zod
        const validatedParams = MyToolSchema.parse(params);
        logToFile('INFO', 'My tool called', validatedParams);
        
        // 5. Business logic implementation
        const result = await client.someMethod(validatedParams);
        
        // 6. Return MCP-compliant response
        return {
          content: [
            {
              type: "text",
              text: `Tool completed successfully: ${JSON.stringify(result)}`
            }
          ]
        };
      } catch (error) {
        logToFile('ERROR', 'Error in my_tool', error);
        
        // 7. Handle Zod validation errors
        if (error instanceof z.ZodError) {
          const errorMessage = error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          ).join(', ');
          return {
            content: [
              {
                type: "text",
                text: `Validation error: ${errorMessage}`
              }
            ]
          };
        }
        
        // 8. Handle other errors gracefully
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

  logToFile('INFO', 'My tool registered successfully');
}
```

### Tool Development Checklist

- [ ] **Zod schema** defined for all parameters
- [ ] **Clear description** for Claude's understanding
- [ ] **JSON Schema** matches Zod schema
- [ ] **Input validation** with meaningful error messages
- [ ] **Structured logging** for debugging
- [ ] **MCP-compliant response** format
- [ ] **Error handling** for all failure modes
- [ ] **Unit tests** for business logic
- [ ] **Integration tests** for MCP protocol
- [ ] **Documentation** updated

## API Client Development

### Client Design Pattern

The template includes a robust API client pattern:

```typescript
export class ApiClient {
  private client: AxiosInstance;
  private cache = new Map<string, { data: any; expires: number }>();
  
  constructor(private config: Config) {
    // Setup axios with authentication, timeouts, interceptors
  }
  
  async getData(params: any): Promise<ApiResponse> {
    // 1. Check cache first
    const cacheKey = this.getCacheKey(url, params);
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;
    
    // 2. Make API call with error handling
    try {
      const response = await this.client.get(url, { params });
      const data = response.data;
      
      // 3. Cache successful responses
      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      // 4. Log and re-throw for tool handling
      this.logToFile('ERROR', 'API call failed', { url, params, error });
      throw error;
    }
  }
}
```

### API Integration Best Practices

1. **Authentication**: Centralized in client constructor
2. **Caching**: Implement with TTL for expensive operations
3. **Error Handling**: Log at client level, handle at tool level
4. **Timeouts**: Configure reasonable defaults
5. **Rate Limiting**: Respect API limits with proper delays
6. **Retries**: Implement for transient failures

## Configuration Management

### Environment Variable Pattern

```typescript
// src/config.ts
import { z } from 'zod';

const ConfigSchema = z.object({
  // Required configuration
  apiKey: z.string().min(1, 'API_KEY environment variable is required'),
  
  // Optional with defaults
  apiEndpoint: z.string().url().default('https://api.example.com'),
  cacheTtlSeconds: z.number().int().positive().default(300),
  
  // Conditional configuration
  debugMode: z.boolean().default(false),
});

export function loadConfig(): Config {
  try {
    const rawConfig = {
      apiKey: process.env.API_KEY,
      apiEndpoint: process.env.API_ENDPOINT,
      cacheTtlSeconds: process.env.CACHE_TTL_SECONDS ? 
        parseInt(process.env.CACHE_TTL_SECONDS, 10) : undefined,
      debugMode: process.env.DEBUG === 'true',
    };

    return ConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      throw new Error(`Configuration validation failed: ${errorMessages}`);
    }
    throw error;
  }
}
```

### Configuration Best Practices

- **Use Zod schemas** for validation
- **Provide clear error messages** for missing configuration
- **Support defaults** for non-critical settings
- **Document all variables** in `.env.example`
- **Validate on startup** before server initialization

## Error Handling Strategy

### Error Hierarchy

1. **Configuration Errors**: Fatal, prevent startup
2. **API Client Errors**: Logged, propagated to tools
3. **Tool Parameter Errors**: Validation errors, user-friendly messages
4. **Business Logic Errors**: Handled gracefully, informative responses

### Error Response Pattern

```typescript
// Good: MCP-compliant error response
return {
  content: [
    {
      type: "text",
      text: `Unable to complete request: ${userFriendlyMessage}`
    }
  ]
};

// Bad: Unhandled exception
throw new Error("Internal error details");
```

### Logging Strategy

```typescript
// Structured logging with context
logToFile('ERROR', 'Operation failed', {
  operation: 'fetchData',
  parameters: sanitizedParams,
  error: error.message,
  stack: error.stack
});
```

## Testing Development

### Test-Driven Development

1. **Write failing test** first
2. **Implement minimal code** to pass
3. **Refactor** with confidence
4. **Add integration test** for MCP compliance

### Testing Workflow

```bash
# Run tests during development
npm run test:watch

# Focus on specific test files
npm run test:unit -- my-tool

# Check coverage
npm run test:coverage
```

### Mock Development

Use MSW for consistent API mocking:

```typescript
// tests/mocks/handlers.ts
export const handlers = [
  http.get('https://api.example.com/data', ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (id === 'error') {
      return HttpResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json({
      data: { id, name: `Item ${id}` }
    });
  }),
];
```

## Performance Optimization

### Caching Strategy

1. **API Response Caching**: Cache expensive API calls
2. **TTL Management**: Appropriate expiration times
3. **Cache Invalidation**: Clear on errors or updates
4. **Memory Management**: Prevent cache from growing unbounded

### Build Optimization

```typescript
// tsconfig.json optimizations
{
  "compilerOptions": {
    "target": "ES2022",        // Modern JavaScript features
    "module": "Node16",        // ESM support
    "skipLibCheck": true,      // Faster compilation
    "incremental": true        // Faster rebuilds
  }
}
```

### Runtime Performance

- **Lazy Loading**: Load heavy dependencies only when needed
- **Connection Pooling**: Reuse HTTP connections
- **Debouncing**: Prevent rapid successive calls
- **Monitoring**: Log performance metrics

## Security Considerations

### API Key Management

- **Never commit secrets** to version control
- **Use environment variables** for all sensitive data
- **Validate permissions** on startup
- **Rotate keys regularly**

### Input Validation

- **Validate all inputs** with Zod schemas
- **Sanitize user data** before API calls
- **Prevent injection attacks** with parameterized queries
- **Limit input sizes** to prevent DoS

### Error Information

- **Don't leak sensitive data** in error messages
- **Log detailed errors** internally
- **Return generic errors** to users
- **Monitor for suspicious patterns**

## Documentation Standards

### Code Documentation

```typescript
/**
 * Retrieves user data from the API with caching.
 * 
 * @param userId - The unique identifier for the user
 * @param options - Optional parameters for the request
 * @returns Promise resolving to user data
 * 
 * @throws {Error} When user is not found or API is unreachable
 * 
 * @example
 * ```typescript
 * const user = await client.getUser('123');
 * console.log(user.name);
 * ```
 */
async getUser(userId: string, options?: GetUserOptions): Promise<User> {
  // Implementation
}
```

### README Updates

When adding features:
- Update installation/setup instructions
- Add new environment variables to configuration section
- Document new tools and their usage
- Update troubleshooting section

## Deployment Considerations

### Build Preparation

```bash
# Production build
npm run build
npm run test
npm run typecheck

# Verify build outputs
ls -la dist/
```

### Environment Configuration

```bash
# Production environment variables
NODE_ENV=production
API_KEY=your-production-key
CACHE_TTL_SECONDS=300
TIMEOUT=30000
```

### Monitoring and Logging

- **Structured logging** for production analysis
- **Health check endpoints** for monitoring
- **Performance metrics** collection
- **Error tracking** integration

---

*This development guide should be updated as new patterns and best practices are discovered during MCP server development.*