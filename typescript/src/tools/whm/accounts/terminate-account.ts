import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../../types.js";
import { textResult, errorResult } from "../../../types.js";
import { whm } from "../../../client/whm.js";
import { cpanelUsernameSchema, sanitizeToolError } from "../../../validators.js";

const schema = z.object({
  user: cpanelUsernameSchema.describe("cPanel username to permanently terminate"),
  keepdns: z.enum(["0", "1"]).optional().describe("Set to '1' to keep DNS zone after termination"),
});

export const whmTerminateAccount: McpAction = {
  tool: {
    name: "cpanel_whm_terminate_account",
    description: "Permanently terminate a cPanel account. This action is irreversible.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { user, keepdns } = schema.parse(request.params.arguments);
      const params: Record<string, string> = { user };
      if (keepdns) params.keepdns = keepdns;
      const data = await whm("removeacct", params);
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
