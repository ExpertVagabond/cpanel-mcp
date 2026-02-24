import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  dir: z.string().optional().describe("Directory path to list (default: home directory)"),
  types: z.string().optional().describe("Filter: file, dir, or both"),
});

export const filesList: McpAction = {
  tool: {
    name: "cpanel_files_list",
    description: "List files and directories in a given path on the cPanel account.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { dir, types } = schema.parse(request.params.arguments);
    try {
      const params: Record<string, string> = {};
      if (dir) params.dir = dir;
      if (types) params.types = types;
      const data = await uapi("Fileman", "list_files", params);
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
