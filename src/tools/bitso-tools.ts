import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from 'fs';
import { BitsoApiClient } from "../client.js";
import { ToolResult } from "../types.js";
import { Funding } from "../types.js";
import { createLogger } from "../utils/logging.js";

const logToFile = createLogger(import.meta.url, 'BITSO_TOOLS');

const ListWithdrawalsSchema = z.object({
  currency: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  marker: z.string().optional(),
  method: z.string().optional(),
  origin_id: z.string().optional(),
  status: z.string().optional(),
  wid: z.string().optional(),
});

const GetWithdrawalSchema = z.object({
  wid: z.string().min(1, "Withdrawal ID is required"),
});

const GetWithdrawalsByIdsSchema = z.object({
  wids: z.string().min(1, "Comma-separated withdrawal IDs are required"),
});

const GetWithdrawalsByOriginIdsSchema = z.object({
  origin_ids: z.string().min(1, "Comma-separated origin IDs are required"),
});

const ListFundingsSchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  marker: z.string().optional(),
  method: z.string().optional(),
  status: z.string().optional(),
  fids: z.string().optional(),
});

const GetFundingSchema = z.object({
  fid: z.string().min(1, "Funding ID is required"),
});

const ExportFundingsSchema = z.object({
  filepath: z.string().min(1, "Filepath is required"),
});

export function registerBitsoTools(server: McpServer, client: BitsoApiClient): void {
  // Tool 1: List withdrawals
  server.tool(
    "list_withdrawals",
    {
      description: "List withdrawals with optional filtering parameters",
      inputSchema: {
        type: "object",
        properties: {
          currency: {
            type: "string",
            description: "Filter by transaction currency"
          },
          limit: {
            type: "number",
            description: "Number of objects to return (max 100, default 25)",
            minimum: 1,
            maximum: 100
          },
          marker: {
            type: "string",
            description: "Pagination marker"
          },
          method: {
            type: "string",
            description: "Filter by withdrawal method"
          },
          origin_id: {
            type: "string",
            description: "Filter by client-supplied ID"
          },
          status: {
            type: "string",
            description: "Filter by withdrawal status"
          },
          wid: {
            type: "string",
            description: "Filter by specific withdrawal ID"
          }
        }
      }
    },
    async (params): Promise<ToolResult> => {
      try {
        const validatedParams = ListWithdrawalsSchema.parse(params);
        logToFile('INFO', 'List withdrawals tool called', validatedParams);
        
        const response = await client.getWithdrawals(validatedParams);
        
        if (!response.success || !response.payload || response.payload.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No withdrawals found with the specified criteria."
              }
            ]
          };
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                count: response.payload.length,
                withdrawals: response.payload.map(withdrawal => ({
                  wid: withdrawal.wid,
                  status: withdrawal.status,
                  currency: withdrawal.currency,
                  amount: withdrawal.amount,
                  method: withdrawal.method,
                  created_at: withdrawal.created_at,
                  origin_id: withdrawal.origin_id || null,
                  asset: withdrawal.asset || null,
                  network: withdrawal.network || null,
                  protocol: withdrawal.protocol || null
                }))
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        logToFile('ERROR', 'Error in list_withdrawals tool', error);
        
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
              text: `Error listing withdrawals: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Tool 2: Get specific withdrawal
  server.tool(
    "get_withdrawal",
    {
      description: "Get details of a specific withdrawal by ID",
      inputSchema: {
        type: "object",
        properties: {
          wid: {
            type: "string",
            description: "The withdrawal ID to retrieve"
          }
        },
        required: ["wid"]
      }
    },
    async (params): Promise<ToolResult> => {
      try {
        const validatedParams = GetWithdrawalSchema.parse(params);
        logToFile('INFO', 'Get withdrawal tool called', { wid: validatedParams.wid });
        
        const withdrawal = await client.getWithdrawal(validatedParams.wid);
        
        return {
          content: [
            {
              type: "text",
              text: `Withdrawal Details:
ID: ${withdrawal.wid}
Status: ${withdrawal.status}
Currency: ${withdrawal.currency}
Amount: ${withdrawal.amount}
Method: ${withdrawal.method}
Created: ${withdrawal.created_at}
${withdrawal.origin_id ? `Origin ID: ${withdrawal.origin_id}` : ''}
${withdrawal.asset ? `Asset: ${withdrawal.asset}` : ''}
${withdrawal.network ? `Network: ${withdrawal.network}` : ''}
${withdrawal.protocol ? `Protocol: ${withdrawal.protocol}` : ''}
Details: ${JSON.stringify(withdrawal.details, null, 2)}`
            }
          ]
        };
      } catch (error) {
        logToFile('ERROR', 'Error in get_withdrawal tool', error);
        
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
              text: `Error retrieving withdrawal: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Tool 3: Get withdrawals by multiple IDs
  server.tool(
    "get_withdrawals_by_ids",
    {
      description: "Get multiple withdrawals by comma-separated withdrawal IDs",
      inputSchema: {
        type: "object",
        properties: {
          wids: {
            type: "string",
            description: "Comma-separated withdrawal IDs (e.g., 'wid1,wid2,wid3')"
          }
        },
        required: ["wids"]
      }
    },
    async (params): Promise<ToolResult> => {
      try {
        const validatedParams = GetWithdrawalsByIdsSchema.parse(params);
        logToFile('INFO', 'Get withdrawals by IDs tool called', { wids: validatedParams.wids });
        
        const response = await client.getWithdrawals({ wid: validatedParams.wids });
        
        if (!response.success || !response.payload || response.payload.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No withdrawals found with the specified IDs."
              }
            ]
          };
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                count: response.payload.length,
                withdrawals: response.payload.map(withdrawal => ({
                  wid: withdrawal.wid,
                  status: withdrawal.status,
                  currency: withdrawal.currency,
                  amount: withdrawal.amount,
                  method: withdrawal.method,
                  created_at: withdrawal.created_at,
                  origin_id: withdrawal.origin_id || null
                }))
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        logToFile('ERROR', 'Error in get_withdrawals_by_ids tool', error);
        
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
              text: `Error retrieving withdrawals: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Tool 4: Get withdrawals by origin IDs
  server.tool(
    "get_withdrawals_by_origin_ids",
    {
      description: "Get withdrawals by comma-separated origin IDs (client-supplied IDs)",
      inputSchema: {
        type: "object",
        properties: {
          origin_ids: {
            type: "string",
            description: "Comma-separated origin IDs (e.g., 'origin1,origin2,origin3')"
          }
        },
        required: ["origin_ids"]
      }
    },
    async (params): Promise<ToolResult> => {
      try {
        const validatedParams = GetWithdrawalsByOriginIdsSchema.parse(params);
        logToFile('INFO', 'Get withdrawals by origin IDs tool called', { origin_ids: validatedParams.origin_ids });
        
        const response = await client.getWithdrawals({ origin_id: validatedParams.origin_ids });
        
        if (!response.success || !response.payload || response.payload.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No withdrawals found with the specified origin IDs."
              }
            ]
          };
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                count: response.payload.length,
                withdrawals: response.payload.map(withdrawal => ({
                  wid: withdrawal.wid,
                  status: withdrawal.status,
                  currency: withdrawal.currency,
                  amount: withdrawal.amount,
                  method: withdrawal.method,
                  created_at: withdrawal.created_at,
                  origin_id: withdrawal.origin_id
                }))
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        logToFile('ERROR', 'Error in get_withdrawals_by_origin_ids tool', error);
        
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
              text: `Error retrieving withdrawals: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Tool 5: List fundings
  server.tool(
    "list_fundings",
    {
      description: "List fundings with optional filtering parameters",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of objects to return (max 100, default 25)",
            minimum: 1,
            maximum: 100
          },
          marker: {
            type: "string",
            description: "Pagination marker"
          },
          method: {
            type: "string",
            description: "Filter by funding method"
          },
          status: {
            type: "string",
            description: "Filter by funding status"
          },
          fids: {
            type: "string",
            description: "Comma-separated funding IDs to filter by"
          }
        }
      }
    },
    async (params): Promise<ToolResult> => {
      try {
        const validatedParams = ListFundingsSchema.parse(params);
        logToFile('INFO', 'List fundings tool called', validatedParams);
        
        const response = await client.getFundings(validatedParams);
        
        if (!response.success || !response.payload || response.payload.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No fundings found with the specified criteria."
              }
            ]
          };
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                count: response.payload.length,
                fundings: response.payload.map(funding => ({
                  fid: funding.fid,
                  status: funding.status,
                  currency: funding.currency,
                  amount: funding.amount,
                  method: funding.method,
                  created_at: funding.created_at,
                  details: funding.details
                }))
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        logToFile('ERROR', 'Error in list_fundings tool', error);
        
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
              text: `Error listing fundings: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  // Tool 6: Get specific funding
  server.tool(
    "get_funding",
    {
      description: "Get details of a specific funding by ID",
      inputSchema: {
        type: "object",
        properties: {
          fid: {
            type: "string",
            description: "The funding ID to retrieve"
          }
        },
        required: ["fid"]
      }
    },
    async (params): Promise<ToolResult> => {
      try {
        const validatedParams = GetFundingSchema.parse(params);
        logToFile('INFO', 'Get funding tool called', { fid: validatedParams.fid });
        
        const funding = await client.getFunding(validatedParams.fid);
        
        return {
          content: [
            {
              type: "text",
              text: `Funding Details:
ID: ${funding.fid}
Status: ${funding.status}
Currency: ${funding.currency}
Amount: ${funding.amount}
Method: ${funding.method}
Created: ${funding.created_at}
Details: ${JSON.stringify(funding.details, null, 2)}`
            }
          ]
        };
      } catch (error) {
        logToFile('ERROR', 'Error in get_funding tool', error);
        
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
              text: `Error retrieving funding: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  server.tool(
    "export_fundings",
    {
      description: "Export all funding transactions to CSV file with columns: method, currency, gross, fee, net amount, timestamp, datetime",
      inputSchema: {
        type: "object",
        properties: {
          filepath: {
            type: "string",
            description: "Path where the CSV file should be created"
          }
        },
        required: ["filepath"]
      }
    },
    async (params): Promise<ToolResult> => {
      try {
        const validatedParams = ExportFundingsSchema.parse(params);
        logToFile('INFO', 'Export fundings tool called', { filepath: validatedParams.filepath });
        
        const allFundings: Funding[] = [];
        let marker: string | undefined;
        
        do {
          const response = await client.getFundings({ 
            limit: 100, 
            marker 
          });
          
          if (!response.success || !response.payload) {
            break;
          }
          
          allFundings.push(...response.payload);
          
          marker = response.payload.length === 100 ? response.payload[response.payload.length - 1].fid : undefined;
        } while (marker);
        
        if (allFundings.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No funding transactions found to export."
              }
            ]
          };
        }
        
        const csvHeader = "method,currency,gross,fee,net amount,timestamp,datetime\n";
        const csvRows = allFundings.map(funding => {
          const createdDate = new Date(funding.created_at);
          const timestamp = Math.floor(createdDate.getTime() / 1000);
          const datetime = createdDate.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }).replace(',', '');
          
          const gross = funding.amount;
          const fee = "0";
          const netAmount = funding.amount;
          
          return `${funding.method},${funding.currency},${gross},${fee},${netAmount},${timestamp},${datetime}`;
        }).join('\n');
        
        const csvContent = csvHeader + csvRows;
        
        fs.writeFileSync(validatedParams.filepath, csvContent, 'utf8');
        
        logToFile('INFO', 'Fundings exported successfully', { 
          filepath: validatedParams.filepath,
          recordCount: allFundings.length 
        });
        
        return {
          content: [
            {
              type: "text",
              text: `Successfully exported ${allFundings.length} funding transactions to ${validatedParams.filepath}`
            }
          ]
        };
      } catch (error) {
        logToFile('ERROR', 'Error in export_fundings tool', error);
        
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
              text: `Error exporting fundings: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  logToFile('INFO', 'All Bitso tools registered successfully');
}
