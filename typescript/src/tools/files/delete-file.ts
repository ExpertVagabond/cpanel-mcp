import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";
import { safePathSchema, sanitizeToolError } from "../../validators.js";

const schema = z.object({
  path: safePathSchema.describe("Full path to the file or directory to delete"),
});

export const filesDelete: McpAction = {
  tool: {
    name: "cpanel_files_delete",
    description: "Delete a file or directory from the cPanel account.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { path } = schema.parse(request.params.arguments);
      const data = await uapi("Fileman", "fileop", { op: "unlink", sourcefiles: path });
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
