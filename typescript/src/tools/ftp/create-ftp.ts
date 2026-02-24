import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  user: z.string().describe("FTP username"),
  pass: z.string().describe("FTP password"),
  homedir: z.string().optional().describe("Home directory for the FTP account"),
  quota: z.string().optional().describe("Disk quota in MB (0 for unlimited)"),
});

export const ftpCreateAccount: McpAction = {
  tool: {
    name: "cpanel_ftp_create_account",
    description: "Create a new FTP account with password and optional quota.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { user, pass, homedir, quota } = schema.parse(request.params.arguments);
    try {
      const params: Record<string, string> = { user, pass };
      if (homedir) params.homedir = homedir;
      if (quota) params.quota = quota;
      const data = await uapi("Ftp", "add_ftp", params);
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
