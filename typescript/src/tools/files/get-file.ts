import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  dir: z.string().describe("Directory containing the file"),
  file: z.string().describe("Filename to read"),
});

export const filesGetContent: McpAction = {
  tool: {
    name: "cpanel_files_get_content",
    description: "Read the contents of a text file from the cPanel account.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { dir, file } = schema.parse(request.params.arguments);
    try {
      const data = await uapi("Fileman", "get_file_content", { dir, file });
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
