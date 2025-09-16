import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from 'fs';
import { BitsoApiClient } from "../client.js";
import { ToolResult } from "../types.js";
import { Funding } from "../types.js";
import { createLogger } from "../utils/logging.js";

const logToFile = createLogger(import.meta.url, 'BITSO_TOOLS');

export function registerBitsoTools(server: McpServer, client: BitsoApiClient): void {
  server.tool(
    "export_fundings",
    {
      filepath: z.string().min(1, "Filepath is required").describe("Path where the CSV file should be created")
    },
    async ({ filepath }): Promise<ToolResult> => {
      try {
        logToFile('INFO', 'Export fundings tool called', { filepath });

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

        fs.writeFileSync(filepath, csvContent, 'utf8');

        logToFile('INFO', 'Fundings exported successfully', {
          filepath,
          recordCount: allFundings.length
        });

        return {
          content: [
            {
              type: "text",
              text: `Successfully exported ${allFundings.length} funding transactions to ${filepath}`
            }
          ]
        };
      } catch (error) {
        logToFile('ERROR', 'Error in export_fundings tool', error);

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

  logToFile('INFO', 'Export fundings tool registered successfully');
}