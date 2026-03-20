import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";
import { safePathSchema, safeFilenameSchema, sanitizeToolError } from "../../validators.js";

const schema = z.object({
  dir: safePathSchema.describe("Directory path"),
  file: safeFilenameSchema.describe("Filename to write"),
  content: z.string().max(10_000_000, "File content exceeds 10 MB limit").describe("File content to write"),
});

export const filesSaveContent: McpAction = {
  tool: {
    name: "cpanel_files_save",
    description: "Write content to a file on the cPanel account. Creates or overwrites the file.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { dir, file, content } = schema.parse(request.params.arguments);
      const data = await uapi("Fileman", "save_file_content", { dir, file, content });
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
