# Claude Context - TypeScript MCP Template

## Expertise Areas

I am an expert TypeScript MCP (Model Context Protocol) developer with deep knowledge of:

- MCP server architecture and tool registration patterns
- TypeScript/ESM module systems and build tooling
- Two-tier testing strategies (unit + integration)
- Production logging and debugging systems
- API client design with caching and error handling

## Project Context

This is a **production-ready TypeScript MCP template** that demonstrates best practices for building MCP servers. It serves as a foundation for developers to create their own MCP servers with:

- Dual transport support (stdio for Claude, HTTP for development)
- Comprehensive testing infrastructure
- Type-safe configuration management
- Robust error handling and logging
- Tool generation utilities

## Key Architecture Decisions

### Dual Transport Support
- **stdio**: Production mode for Claude Desktop integration
- **HTTP**: Development mode for debugging and testing
- Seamless switching via command-line arguments

### Two-Tier Testing Strategy
- **Unit tests** (`tests/unit/`): Fast, MSW-mocked, business logic focused
- **Integration tests** (`tests/integration/`): Real MCP protocol testing
- No inline function duplications - tests use actual server instances

### Project-Root-Aware Logging
- Logs written to `mcp-debug.log` in project root
- Works correctly from both `src/` and `dist/` locations
- Structured logging with timestamp and component prefixes

### Type-Safe Configuration
- Zod schemas for environment variable validation
- Clear error messages for missing/invalid configuration
- Default values and optional parameters

## Development Workflow

### Building and Testing Changes

**IMPORTANT**: After making changes to TypeScript files, always rebuild:

```bash
npm run build
```

**Development cycle:**
1. Make changes to TypeScript files in `src/`
2. Run `npm run build` to compile changes
3. **IMPORTANT**: Restart Claude Desktop to get latest MCP server build
4. Test changes in Claude Desktop or via HTTP mode
5. Debug using logs in `mcp-debug.log`
6. Run tests: `npm test`

### Tool Development Pattern

1. **Define types** in `src/types.ts` for your domain
2. **Implement API client** methods in `src/client.ts`
3. **Create tools** in `src/tools/` following example patterns
4. **Write unit tests** for business logic with MSW mocking
5. **Write integration tests** for MCP protocol compliance
6. **Update registration** in tool modules and main index

### Testing Best Practices

**Unit Tests (`tests/unit/`)**:
- Test business logic in isolation
- Mock external APIs with MSW
- Validate data transformations and caching
- Fast execution for development feedback

**Integration Tests (`tests/integration/`)**:
- Test through real MCP server instances
- Validate tool registration and schemas
- Ensure MCP response format compliance
- Test error handling through protocol

**Never**:
- Duplicate tool implementations in tests
- Test inline functions instead of MCP protocol
- Skip MCP response format validation

## Template Customization Guide

### For New MCP Servers

1. **Replace API integration**:
   - Update `src/types.ts` with your domain types
   - Implement your API methods in `src/client.ts`
   - Update MSW handlers in `tests/mocks/handlers.ts`

2. **Remove example tools**:
   - Delete `src/tools/example-tools.ts`
   - Create your own tool modules following the same pattern
   - Update registration in `src/index.ts`

3. **Update configuration**:
   - Modify `src/config.ts` for your environment variables
   - Update `.env.example` with your required configuration
   - Update documentation in README.md

4. **Customize build and deployment**:
   - Update `package.json` name, description, repository
   - Modify CI/CD workflows if needed
   - Update deployment instructions

### Tool Registration Pattern

```typescript
export function registerYourTools(server: McpServer, client: ApiClient): void {
  server.tool(
    "tool_name",
    {
      description: "Tool description",
      inputSchema: { /* MCP schema */ }
    },
    async (params): Promise<ToolResult> => {
      try {
        const validatedParams = Schema.parse(params);
        // Tool implementation
        return { content: [{ type: "text", text: "result" }] };
      } catch (error) {
        // Error handling
      }
    }
  );
}
```

## Debugging and Troubleshooting

### Common Issues

1. **Tools not appearing in Claude**:
   - Verify build completed: `npm run build`
   - Check `mcp-debug.log` for errors
   - Restart Claude Desktop
   - Validate `claude_desktop_config.json`

2. **API integration errors**:
   - Check environment variables are set
   - Verify API credentials and endpoints
   - Review client configuration and error handling
   - Test connection with `test_connection` tool

3. **Test failures**:
   - Run unit tests first for quick feedback
   - Check MSW handlers match API expectations
   - Verify integration tests use real server instances
   - Ensure MCP response format compliance

### Debug Logging

Enable detailed logging:
```bash
DEBUG=true npm start
```

Check logs:
```bash
tail -f mcp-debug.log
```

### Development vs Production

- **Development**: Use HTTP transport (`npm run start:http`)
- **Production**: Use stdio transport (`npm start`)
- **Testing**: Both unit and integration test suites

## Template Maintenance

This template should be updated when:
- MCP SDK versions change
- New testing patterns are discovered
- Better error handling approaches are found
- Performance optimizations are identified

The template demonstrates production-ready patterns learned from building real MCP servers and should evolve with the ecosystem.

## Anti-Patterns to Avoid

❌ **Don't**: Create tool implementations in test files  
❌ **Don't**: Mock MCP protocol instead of testing real server  
❌ **Don't**: Skip error handling in tools  
❌ **Don't**: Ignore MCP response format requirements  
❌ **Don't**: Use relative imports from dist/ directory  

✅ **Do**: Test tools through real MCP server instances  
✅ **Do**: Use Zod schemas for all parameter validation  
✅ **Do**: Return MCP-compliant response formats  
✅ **Do**: Log extensively for debugging  
✅ **Do**: Handle errors gracefully with user-friendly messages