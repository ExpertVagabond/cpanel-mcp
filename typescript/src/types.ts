import type {
  CallToolRequest,
  CallToolResult,
  ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js";
import {
  textResult as coreTextResult,
  jsonResult as coreJsonResult,
  errorResult as coreErrorResult,
} from "@psm/mcp-core-ts";

type Tool = ListToolsResult["tools"][0];

export type ToolInputSchema = Tool["inputSchema"];

/**
 * McpAction — local variant that receives the full MCP SDK CallToolRequest.
 * Kept because all 47 tools reference `request.params.arguments` directly.
 */
export interface McpAction {
  tool: Tool;
  handler: (request: CallToolRequest) => Promise<CallToolResult>;
}

/** Create a successful text result (delegates to @psm/mcp-core-ts). */
export function textResult(data: unknown): CallToolResult {
  if (typeof data === "string") {
    return coreTextResult(data) as CallToolResult;
  }
  return coreJsonResult(data) as CallToolResult;
}

/** Create an error result (delegates to @psm/mcp-core-ts). */
export function errorResult(message: string): CallToolResult {
  return coreErrorResult(`Error: ${message}`) as CallToolResult;
}
