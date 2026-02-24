import type {
  CallToolRequest,
  CallToolResult,
  ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js";

type Tool = ListToolsResult["tools"][0];

export type ToolInputSchema = Tool["inputSchema"];

export interface McpAction {
  tool: Tool;
  handler: (request: CallToolRequest) => Promise<CallToolResult>;
}

export function textResult(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function errorResult(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}
