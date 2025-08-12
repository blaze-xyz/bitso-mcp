# Testing Best Practices

This document outlines the testing best practices and architecture decisions for TypeScript MCP servers built with this template.

## Testing Philosophy

### Two-Tier Testing Strategy

We employ a **two-tier testing approach** that separates concerns and provides comprehensive coverage:

1. **Unit Tests** (`tests/unit/`) - Test business logic in isolation
2. **Integration Tests** (`tests/integration/`) - Test through real MCP protocol

### Key Principle: Test the Real Thing

> **Golden Rule**: Integration tests must use the actual MCP server and protocol, not inline function duplications.

**Why**: Integration tests should validate the same code path that Claude uses when interacting with the server. Testing inline functions creates false confidence and doesn't catch MCP protocol issues.

## Unit Testing Best Practices

### Structure
- **Location**: `tests/unit/`
- **Pattern**: `{tool-name}.test.ts` (e.g., `list-resources.test.ts`, `search-resources.test.ts`)
- **Focus**: Business logic, API interactions, data transformations
- **Organization**: One test file per tool for better maintainability

### Key Practices
- Mock external APIs using MSW (Mock Service Worker)
- Test error conditions and edge cases
- Validate caching behavior
- Keep tests fast and isolated

### Example Structure
```typescript
// tests/unit/tools/my-tool.test.ts
describe('My Tool Unit Tests', () => {
  let client: ApiClient

  beforeEach(() => {
    client = new ApiClient(createTestConfig())
  })

  describe('Business Logic', () => {
    it('should process data correctly')
    it('should handle edge cases')
    it('should cache results appropriately')
  })

  describe('Parameter Validation', () => {
    it('should validate required parameters')
    it('should handle invalid inputs gracefully')
  })
})
```

## Integration Testing Best Practices

### Architecture: Real MCP Server Testing

Integration tests use **actual MCP server instances** through our custom testing infrastructure:

1. **Test Server Factory** (`tests/helpers/test-server-factory.ts`)
   - Creates real MCP server instances with all tools registered
   - Uses same tool registration functions as production server
   - Ensures test and production environments are identical

2. **MCP Test Helper** (`tests/helpers/mcp-test-helper.ts`)
   - Provides interface to call MCP tools through real protocol
   - Accesses server internals via `_registeredTools` registry
   - Validates MCP response format compliance

### Key Implementation Details

#### Tool Calling Mechanism
```typescript
// Discovered through debugging: MCP tools use 'callback' property
if (tool.callback && typeof tool.callback === 'function') {
  result = await tool.callback(args)
}
```

#### MCP Response Validation
```typescript
// All MCP responses must follow this format
if (!result || !result.content || !Array.isArray(result.content)) {
  throw new Error(`Invalid MCP response format`)
}
```

### Integration Test Structure
- **Location**: `tests/integration/`
- **Pattern**: `{tool-name}-integration.test.ts`
- **Organization**: One integration test file per tool for better maintainability

```typescript
// tests/integration/tools/my-tool-integration.test.ts
describe('My Tool Integration Tests', () => {
  let server: McpServer
  let mcpHelper: McpTestHelper

  beforeEach(() => {
    const testServer = createTestServer()
    server = testServer.server
    mcpHelper = new McpTestHelper(server)
  })

  describe('MCP Protocol Compliance', () => {
    it('should register tool correctly', () => {
      const tools = mcpHelper.listTools()
      expect(tools).toContain('my_tool')
    })
  })

  describe('my_tool via MCP protocol', () => {
    it('should return properly formatted MCP response', async () => {
      const result = await mcpHelper.callTool('my_tool', validParams)
      expect(result.content[0].type).toBe('text')
    })
  })
})
```

## Tool Registration Best Practices

### Single Source of Truth
- **Never duplicate tools** between production and test environments
- Tools should be defined once in `src/tools/` modules
- Both production (`src/index.ts`) and tests use same registration functions

### Tool Organization
```
src/tools/
├── resource-tools.ts      # Resource management tools
├── search-tools.ts        # Search and discovery tools  
└── utility-tools.ts       # Utility and system tools
```

### Registration Pattern
```typescript
export function registerResourceTools(server: McpServer, client: ApiClient) {
  server.tool("tool_name", { schema }, async (params) => {
    // Implementation
    return { content: [{ type: "text", text: "result" }] }
  })
}
```

## CI/CD Pipeline Structure

### Separate Job Architecture
We use **two separate CI jobs** for optimal feedback and resource usage:

```yaml
jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps: [checkout, setup, build, test:unit]

  integration-tests:  
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: unit-tests  # Only run if unit tests pass
    steps: [checkout, setup, build, test:integration]
```

**Benefits**:
- Faster feedback from unit tests
- Integration tests only run if basics pass
- Clear separation of test types
- Better resource utilization

## Mock Strategy

### MSW (Mock Service Worker)
We use MSW for consistent API mocking across unit and integration tests:

```typescript
// tests/mocks/handlers.ts
export const handlers = [
  http.get('https://api.example.com/resources', () => {
    return HttpResponse.json({ data: mockResources })
  })
]
```

### Mock Data Consistency
- Use realistic mock data that mirrors actual API responses
- Test both success and error scenarios
- Mock network failures for resilience testing

## Discovered Patterns

### MCP Server Internal Structure
Through debugging, we discovered:
- Tools are stored in `server._registeredTools` registry
- Tools have `callback` property (not `handler`) for execution
- Registry can be Map or Object depending on MCP SDK version

### Testing MCP Protocol
- Always validate `{ content: [...] }` response format
- Test MCP compliance, not just business logic
- Use `McpTestHelper.callTool()` for protocol-level testing

## Anti-Patterns to Avoid

❌ **Don't**: Create inline function duplications in integration tests
```typescript
// BAD: Duplicates business logic
const mockListResources = () => { /* reimplemented logic */ }
```

✅ **Do**: Use real MCP server through protocol
```typescript
// GOOD: Tests actual MCP protocol
const result = await mcpHelper.callTool('list_resources')
```

❌ **Don't**: Mix unit and integration test concerns  
❌ **Don't**: Duplicate tool registrations between environments  
❌ **Don't**: Skip MCP response format validation  
❌ **Don't**: Create consolidated test files with multiple tools  
✅ **Do**: Create individual test files per tool per test type

## Test File Organization

### File Structure Preference
We use **individual test files per tool per test type** for better maintainability and clarity:

```
tests/
├── unit/
│   ├── tools/
│   │   ├── resource-tools.test.ts           # Unit tests for resource tools
│   │   ├── search-tools.test.ts             # Unit tests for search tools  
│   │   └── utility-tools.test.ts            # Unit tests for utility tools
├── integration/
│   ├── tools/
│   │   ├── resource-tools-integration.test.ts           # Integration tests for resource tools
│   │   ├── search-tools-integration.test.ts             # Integration tests for search tools
│   │   └── utility-tools-integration.test.ts            # Integration tests for utility tools
└── helpers/
    ├── mcp-test-helper.ts              # MCP protocol testing utilities
    ├── test-server-factory.ts         # Real MCP server creation
    └── test-config.ts                 # Test configuration
```

### Benefits of Individual Files
- **Focused testing**: Each file contains tests for a single tool
- **Better maintainability**: Easier to locate and modify specific tool tests
- **Clearer organization**: Obvious mapping between tools and test files
- **Reduced merge conflicts**: Developers working on different tools won't conflict
- **Faster test discovery**: IDEs can quickly navigate to relevant tests

## Test Maintenance

### When Adding New Tools
1. Create dedicated unit test file: `{tool-name}.test.ts`
2. Create dedicated integration test file: `{tool-name}-integration.test.ts`
3. Add unit tests for business logic in the dedicated unit file
4. Add integration tests for MCP protocol compliance in the dedicated integration file
5. Update CI pipeline if needed
6. Ensure tools are registered in appropriate modules

### When Debugging Test Failures
1. Check MCP server tool registration
2. Verify `_registeredTools` structure
3. Confirm tool calling mechanism (`callback` vs `handler`)
4. Validate MCP response format compliance

## Performance Considerations

- Unit tests should be fast (< 100ms per test)
- Integration tests can be slower but should complete within reasonable time
- Use MSW to avoid actual network calls in tests
- Leverage test parallelization where possible

## Template-Specific Testing

This template provides:

### Test Utilities
- `McpTestHelper`: Real MCP protocol testing
- `createTestServer()`: Production-like server instances
- `createTestConfig()`: Consistent test configuration

### Example Tools
- Demonstrates all testing patterns
- Shows proper error handling
- Validates MCP compliance

### MSW Integration
- Pre-configured for common API patterns
- Easy to extend for your specific APIs
- Consistent between unit and integration tests

---

*This document reflects lessons learned during the implementation of our comprehensive testing strategy and should be updated as we discover new patterns and best practices.*