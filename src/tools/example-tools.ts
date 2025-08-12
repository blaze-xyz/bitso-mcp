import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiClient } from "../client.js";
import { ToolResult } from "../types.js";
import { createLogger } from "../utils/logging.js";

const logToFile = createLogger(import.meta.url, 'TOOLS');

// Tool schemas using Zod for validation
const HelloWorldSchema = z.object({});

const GetResourceSchema = z.object({
  id: z.string().min(1, "Resource ID is required"),
});

const ListResourcesSchema = z.object({
  limit: z.number().int().positive().optional().default(10),
});

const SearchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  limit: z.number().int().positive().optional().default(5),
});

export function registerExampleTools(server: McpServer, client: ApiClient): void {
  // Tool 1: Simple tool with no parameters (hello world)
  server.tool(
    "hello_world",
    {},
    async (): Promise<ToolResult> => {
      try {
        logToFile('INFO', 'Hello world tool called');
        
        return {
          content: [
            {
              type: "text",
              text: "Hello from the TypeScript MCP Template! This tool demonstrates the basic structure of an MCP tool."
            }
          ]
        };
      } catch (error) {
        logToFile('ERROR', 'Error in hello_world tool', error);
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

  // Tool 2: Tool with Zod schema validation
  server.tool(
    "get_resource",
    {
      id: {
        type: "string",
        description: "The ID of the resource to retrieve",
      },
    },
    async (params): Promise<ToolResult> => {
      try {
        // Validate parameters using Zod
        const validatedParams = GetResourceSchema.parse(params);
        logToFile('INFO', 'Get resource tool called', { id: validatedParams.id });
        
        // Call the API client
        const resource = await client.getResource(validatedParams.id);
        
        return {
          content: [
            {
              type: "text",
              text: `Resource Details:
ID: ${resource.id}
Name: ${resource.name}
Description: ${resource.description || 'No description available'}
Created: ${resource.createdAt}
Updated: ${resource.updatedAt}`
            }
          ]
        };
      } catch (error) {
        logToFile('ERROR', 'Error in get_resource tool', error);
        
        // Handle validation errors specifically
        if (error instanceof z.ZodError) {
          const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
          return {
            content: [
              {
                type: "text",
                text: `Validation error: ${errorMessage}`
              }
            ]
          };
        }
        
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving resource: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Tool 3: Tool with external API call simulation
  server.tool(
    "list_resources",
    {
      limit: {
        type: "number",
        description: "Maximum number of resources to return (default: 10)",
        minimum: 1,
        maximum: 100,
      },
    },
    async (params): Promise<ToolResult> => {
      try {
        const validatedParams = ListResourcesSchema.parse(params);
        logToFile('INFO', 'List resources tool called', { limit: validatedParams.limit });
        
        // Call the API client
        const resources = await client.getResources();
        
        // Apply limit
        const limitedResources = resources.slice(0, validatedParams.limit);
        
        if (limitedResources.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No resources found."
              }
            ]
          };
        }
        
        const resourceList = limitedResources.map(resource => 
          `• ${resource.name} (ID: ${resource.id}) - ${resource.description || 'No description'}`
        ).join('\n');
        
        return {
          content: [
            {
              type: "text",
              text: `Found ${limitedResources.length} resource(s):

${resourceList}

Total available: ${resources.length}`
            }
          ]
        };
      } catch (error) {
        logToFile('ERROR', 'Error in list_resources tool', error);
        
        if (error instanceof z.ZodError) {
          const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
          return {
            content: [
              {
                type: "text",
                text: `Validation error: ${errorMessage}`
              }
            ]
          };
        }
        
        return {
          content: [
            {
              type: "text",
              text: `Error listing resources: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Tool 4: Advanced tool with search functionality
  server.tool(
    "search_resources",
    {
      query: {
        type: "string",
        description: "Search query to match against resource names and descriptions",
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (default: 5)",
        minimum: 1,
        maximum: 50,
      },
    },
    async (params): Promise<ToolResult> => {
      try {
        const validatedParams = SearchSchema.parse(params);
        logToFile('INFO', 'Search resources tool called', { 
          query: validatedParams.query, 
          limit: validatedParams.limit 
        });
        
        // Get all resources and filter by search query
        const allResources = await client.getResources();
        const query = validatedParams.query.toLowerCase();
        
        const matchedResources = allResources.filter(resource => 
          resource.name.toLowerCase().includes(query) ||
          (resource.description && resource.description.toLowerCase().includes(query))
        ).slice(0, validatedParams.limit);
        
        if (matchedResources.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No resources found matching "${validatedParams.query}".`
              }
            ]
          };
        }
        
        const searchResults = matchedResources.map(resource => {
          const nameMatch = resource.name.toLowerCase().includes(query) ? '✓' : '';
          const descMatch = resource.description?.toLowerCase().includes(query) ? '✓' : '';
          const matchTypes = [nameMatch && 'name', descMatch && 'description'].filter(Boolean).join(', ');
          
          return `• ${resource.name} (ID: ${resource.id})
  Description: ${resource.description || 'No description'}
  Matches: ${matchTypes}`;
        }).join('\n\n');
        
        return {
          content: [
            {
              type: "text",
              text: `Found ${matchedResources.length} resource(s) matching "${validatedParams.query}":

${searchResults}`
            }
          ]
        };
      } catch (error) {
        logToFile('ERROR', 'Error in search_resources tool', error);
        
        if (error instanceof z.ZodError) {
          const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
          return {
            content: [
              {
                type: "text",
                text: `Validation error: ${errorMessage}`
              }
            ]
          };
        }
        
        return {
          content: [
            {
              type: "text",
              text: `Error searching resources: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Tool 5: Connection test tool
  server.tool(
    "test_connection",
    {},
    async (): Promise<ToolResult> => {
      try {
        logToFile('INFO', 'Test connection tool called');
        
        const isConnected = await client.testConnection();
        
        return {
          content: [
            {
              type: "text",
              text: isConnected 
                ? "✅ Connection successful! API is reachable and responding." 
                : "❌ Connection failed. API is not reachable or not responding properly."
            }
          ]
        };
      } catch (error) {
        logToFile('ERROR', 'Error in test_connection tool', error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Connection test failed: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  logToFile('INFO', 'All example tools registered successfully');
}