export interface ToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  [key: string]: unknown;
}