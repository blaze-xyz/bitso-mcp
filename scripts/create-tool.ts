#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

interface ToolGenerationOptions {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean';
    required: boolean;
    description: string;
  }>;
}

function toPascalCase(str: string): string {
  return str.split(/[-_\s]/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join('');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function generateToolCode(options: ToolGenerationOptions): string {
  const { name, description, parameters } = options;
  const camelCaseName = toCamelCase(name);
  const pascalCaseName = toPascalCase(name);
  const schemaName = `${pascalCaseName}Schema`;

  // Generate Zod schema
  const zodFields = parameters.map(param => {
    let zodType = '';
    switch (param.type) {
      case 'string':
        zodType = 'z.string()';
        if (param.required) {
          zodType += '.min(1, "' + param.description + ' is required")';
        }
        break;
      case 'number':
        zodType = 'z.number()';
        if (param.required) {
          zodType += '.min(0, "' + param.description + ' must be a positive number")';
        }
        break;
      case 'boolean':
        zodType = 'z.boolean()';
        break;
    }
    
    if (!param.required) {
      zodType += '.optional()';
    }
    
    return `  ${param.name}: ${zodType},`;
  }).join('\n');

  // Generate input schema for MCP
  const inputSchemaProperties = parameters.map(param => {
    let type = param.type;
    if (type === 'boolean') type = 'boolean';
    
    return `      ${param.name}: {
        type: "${type}",
        description: "${param.description}",
      },`;
  }).join('\n');

  // Generate tool implementation
  return `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../client.js";
import { ToolResult } from "../types.js";
import { createLogger } from "../utils/logging.js";

const logToFile = createLogger(import.meta.url, 'TOOLS');

// Tool schema using Zod for validation
const ${schemaName} = z.object({
${zodFields}
});

export function register${pascalCaseName}Tool(server: McpServer, client: ApiClient): void {
  server.tool(
    "${name}",
    {
${inputSchemaProperties}
    },
    async (params): Promise<ToolResult> => {
      try {
        // Validate parameters using Zod
        const validatedParams = ${schemaName}.parse(params);
        logToFile('INFO', '${pascalCaseName} tool called', validatedParams);
        
        // TODO: Implement your tool logic here
        // Example: const result = await client.someMethod(validatedParams);
        
        return {
          content: [
            {
              type: "text",
              text: \`${pascalCaseName} tool executed successfully with parameters: \${JSON.stringify(validatedParams, null, 2)}\`
            }
          ]
        };
      } catch (error) {
        logToFile('ERROR', 'Error in ${name} tool', error);
        
        // Handle validation errors specifically
        if (error instanceof z.ZodError) {
          const errorMessage = error.errors.map(err => \`\${err.path.join('.')}: \${err.message}\`).join(', ');
          return {
            content: [
              {
                type: "text",
                text: \`Validation error: \${errorMessage}\`
              }
            ]
          };
        }
        
        return {
          content: [
            {
              type: "text",
              text: \`Error in ${name}: \${error instanceof Error ? error.message : String(error)}\`
            }
          ]
        };
      }
    }
  );

  logToFile('INFO', '${pascalCaseName} tool registered successfully');
}`;
}

function generateUnitTest(options: ToolGenerationOptions): string {
  const { name, parameters } = options;
  const pascalCaseName = toPascalCase(name);

  const validParams = parameters.reduce((acc, param) => {
    let value = '';
    switch (param.type) {
      case 'string':
        value = `"test-${param.name}"`;
        break;
      case 'number':
        value = '42';
        break;
      case 'boolean':
        value = 'true';
        break;
    }
    acc[param.name] = value;
    return acc;
  }, {} as Record<string, string>);

  const validParamsStr = JSON.stringify(validParams, null, 6).replace(/"/g, '');

  return `import { describe, it, expect, beforeEach } from 'vitest';
import { ApiClient } from '../../../src/client.js';
import { createTestConfig } from '../../helpers/test-config.js';

describe('${pascalCaseName} Tool Unit Tests', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient(createTestConfig());
  });

  describe('Parameter Validation', () => {
    it('should validate required parameters', () => {
      const validParams = ${validParamsStr};
      
      // Test that all required parameters are present
      expect(validParams).toBeDefined();
      ${parameters.filter(p => p.required).map(p => 
        `expect(validParams.${p.name}).toBeDefined();`
      ).join('\n      ')}
    });

    it('should handle missing required parameters', () => {
      // Test validation logic for missing required parameters
      const incompleteParams = {};
      
      // Add validation tests based on your Zod schema
      expect(incompleteParams).toBeDefined();
    });
  });

  describe('Tool Logic', () => {
    it('should process valid parameters correctly', async () => {
      // TODO: Add tests for your tool's business logic
      // Example:
      // const result = await client.someMethod(validParams);
      // expect(result).toBeDefined();
      
      expect(true).toBe(true); // Placeholder test
    });
  });
});`;
}

function generateIntegrationTest(options: ToolGenerationOptions): string {
  const { name, parameters } = options;
  const pascalCaseName = toPascalCase(name);

  const validParams = parameters.reduce((acc, param) => {
    let value = '';
    switch (param.type) {
      case 'string':
        value = `"test-${param.name}"`;
        break;
      case 'number':
        value = '42';
        break;
      case 'boolean':
        value = 'true';
        break;
    }
    acc[param.name] = value;
    return acc;
  }, {} as Record<string, string>);

  const validParamsStr = JSON.stringify(validParams, null, 6);

  return `import { describe, it, expect, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpTestHelper } from '../../helpers/mcp-test-helper.js';
import { createTestServer } from '../../helpers/test-server-factory.js';
import { ApiClient } from '../../../src/client.js';

describe('${pascalCaseName} Tool Integration Tests', () => {
  let server: McpServer;
  let client: ApiClient;
  let mcpHelper: McpTestHelper;

  beforeEach(() => {
    const testServer = createTestServer();
    server = testServer.server;
    client = testServer.client;
    mcpHelper = new McpTestHelper(server);
  });

  describe('MCP Protocol Compliance', () => {
    it('should register ${name} tool', () => {
      const tools = mcpHelper.listTools();
      expect(tools).toContain('${name}');
    });

    it('should provide tool information', () => {
      const toolInfo = mcpHelper.getToolInfo('${name}');
      expect(toolInfo).toBeDefined();
      expect(toolInfo?.name).toBe('${name}');
      expect(toolInfo?.description).toBeDefined();
    });
  });

  describe('${name} tool via MCP protocol', () => {
    it('should return properly formatted MCP response with valid parameters', async () => {
      const validParams = ${validParamsStr};
      const result = await mcpHelper.callTool('${name}', validParams);
      
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('${pascalCaseName} tool executed successfully');
    });

    ${parameters.filter(p => p.required).map(param => `
    it('should handle missing ${param.name} parameter', async () => {
      const invalidParams = ${JSON.stringify(
        Object.fromEntries(
          Object.entries(validParams).filter(([key]) => key !== param.name)
        ), null, 8
      )};
      
      const result = await mcpHelper.callTool('${name}', invalidParams);
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Validation error');
    });`).join('')}

    it('should maintain MCP response format even for errors', async () => {
      const result = await mcpHelper.callTool('${name}', { invalid: 'params' });
      
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });
  });
});`;
}

function updateToolsIndex(toolName: string): void {
  const toolsIndexPath = path.join(projectRoot, 'src', 'tools', 'index.ts');
  const pascalCaseName = toPascalCase(toolName);
  const camelCaseName = toCamelCase(toolName);
  
  let content = '';
  if (fs.existsSync(toolsIndexPath)) {
    content = fs.readFileSync(toolsIndexPath, 'utf-8');
  } else {
    content = `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiClient } from "../client.js";

export function registerAllTools(server: McpServer, client: ApiClient): void {
  // Tools will be automatically added here by the create-tool script
}`;
  }

  // Add import
  const importLine = `import { register${pascalCaseName}Tool } from './${camelCaseName}.js';`;
  if (!content.includes(importLine)) {
    const importInsertPos = content.indexOf('export function registerAllTools');
    content = content.slice(0, importInsertPos) + importLine + '\n\n' + content.slice(importInsertPos);
  }

  // Add registration call
  const registrationCall = `  register${pascalCaseName}Tool(server, client);`;
  if (!content.includes(registrationCall)) {
    const closingBracePos = content.lastIndexOf('}');
    content = content.slice(0, closingBracePos) + registrationCall + '\n' + content.slice(closingBracePos);
  }

  fs.writeFileSync(toolsIndexPath, content);
}

function main(): void {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Tool Generator Script

Usage: npm run create-tool

This script will prompt you to create a new MCP tool with:
- Tool implementation with Zod schema validation
- Unit tests
- Integration tests
- Automatic registration

The generated tool will follow the established patterns from the template.
`);
    return;
  }

  console.log('🛠️  MCP Tool Generator');
  console.log('');

  // For now, create a simple example tool
  // In a real implementation, you'd prompt for user input
  const exampleTool: ToolGenerationOptions = {
    name: 'example_new_tool',
    description: 'An example tool generated by the create-tool script',
    parameters: [
      {
        name: 'message',
        type: 'string',
        required: true,
        description: 'The message to process'
      },
      {
        name: 'count',
        type: 'number',
        required: false,
        description: 'Number of times to repeat the message'
      }
    ]
  };

  const toolName = exampleTool.name;
  const camelCaseName = toCamelCase(toolName);

  // Generate tool file
  const toolsDir = path.join(projectRoot, 'src', 'tools');
  const toolFilePath = path.join(toolsDir, `${camelCaseName}.ts`);
  
  if (fs.existsSync(toolFilePath)) {
    console.log(`❌ Tool file already exists: ${toolFilePath}`);
    process.exit(1);
  }

  fs.writeFileSync(toolFilePath, generateToolCode(exampleTool));
  console.log(`✅ Created tool: ${toolFilePath}`);

  // Generate unit test
  const unitTestDir = path.join(projectRoot, 'tests', 'unit', 'tools');
  const unitTestPath = path.join(unitTestDir, `${camelCaseName}.test.ts`);
  
  fs.mkdirSync(unitTestDir, { recursive: true });
  fs.writeFileSync(unitTestPath, generateUnitTest(exampleTool));
  console.log(`✅ Created unit test: ${unitTestPath}`);

  // Generate integration test
  const integrationTestDir = path.join(projectRoot, 'tests', 'integration', 'tools');
  const integrationTestPath = path.join(integrationTestDir, `${camelCaseName}-integration.test.ts`);
  
  fs.mkdirSync(integrationTestDir, { recursive: true });
  fs.writeFileSync(integrationTestPath, generateIntegrationTest(exampleTool));
  console.log(`✅ Created integration test: ${integrationTestPath}`);

  // Update tools index
  updateToolsIndex(toolName);
  console.log(`✅ Updated tools index`);

  console.log('');
  console.log('🎉 Tool generated successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Implement your tool logic in the generated file');
  console.log('2. Update the unit tests to test your specific functionality');
  console.log('3. Run the tests: npm run test');
  console.log('4. Build the project: npm run build');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}