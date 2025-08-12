import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ToolResult } from "./types.js";

// Zod schemas for parameter validation
const GreetSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

const EchoSchema = z.object({
  message: z.string().min(1, "Message is required"),
  times: z.number().int().positive().optional().default(1),
});

export function registerTools(server: McpServer): void {
  // Simple hello tool with no parameters
  server.tool(
    "hello",
    {},
    async (): Promise<ToolResult> => {
      return {
        content: [
          {
            type: "text",
            text: "Hello from the Simple MCP Server! This demonstrates a basic tool with no parameters."
          }
        ]
      };
    }
  );

  // Greet tool with name parameter
  server.tool(
    "greet",
    {
      name: {
        type: "string",
        description: "The name of the person to greet",
      },
    },
    async (params): Promise<ToolResult> => {
      try {
        const { name } = GreetSchema.parse(params);
        
        return {
          content: [
            {
              type: "text",
              text: `Hello, ${name}! Nice to meet you. This demonstrates parameter validation with Zod.`
            }
          ]
        };
      } catch (error) {
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

  // Echo tool with message and optional repetition
  server.tool(
    "echo",
    {
      message: {
        type: "string",
        description: "The message to echo back",
      },
      times: {
        type: "number",
        description: "Number of times to repeat the message (default: 1)",
        minimum: 1,
        maximum: 10,
      },
    },
    async (params): Promise<ToolResult> => {
      try {
        const { message, times } = EchoSchema.parse(params);
        
        const repeatedMessage = Array(times).fill(message).join('\n');
        
        return {
          content: [
            {
              type: "text",
              text: `Echoing your message ${times} time(s):\n\n${repeatedMessage}`
            }
          ]
        };
      } catch (error) {
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

  console.error("Simple MCP Server: All tools registered successfully");
}