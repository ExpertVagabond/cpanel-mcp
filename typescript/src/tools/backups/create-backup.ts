import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  email: z.string().optional().describe("Email address to notify when backup is complete"),
});

export const backupsCreate: McpAction = {
  tool: {
    name: "cpanel_backups_create",
    description: "Create a full backup of the cPanel account to the home directory.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { email } = schema.parse(request.params.arguments);
    try {
      const params: Record<string, string> = {};
      if (email) params.email = email;
      const data = await uapi("Backup", "fullbackup_to_homedir", params);
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
