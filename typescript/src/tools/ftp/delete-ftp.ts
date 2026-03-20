import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";
import { serviceUsernameSchema, sanitizeToolError } from "../../validators.js";

const schema = z.object({
  user: serviceUsernameSchema.describe("FTP username to delete"),
  destroy: z.enum(["0", "1"]).optional().describe("Set to '1' to also delete the FTP user's home directory"),
});

export const ftpDeleteAccount: McpAction = {
  tool: {
    name: "cpanel_ftp_delete_account",
    description: "Delete an FTP account.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { user, destroy } = schema.parse(request.params.arguments);
      const params: Record<string, string> = { user };
      if (destroy) params.destroy = destroy;
      const data = await uapi("Ftp", "delete_ftp", params);
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
