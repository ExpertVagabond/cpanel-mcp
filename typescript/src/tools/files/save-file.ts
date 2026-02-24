import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  dir: z.string().describe("Directory path"),
  file: z.string().describe("Filename to write"),
  content: z.string().describe("File content to write"),
});

export const filesSaveContent: McpAction = {
  tool: {
    name: "cpanel_files_save",
    description: "Write content to a file on the cPanel account. Creates or overwrites the file.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { dir, file, content } = schema.parse(request.params.arguments);
    try {
      const data = await uapi("Fileman", "save_file_content", { dir, file, content });
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
