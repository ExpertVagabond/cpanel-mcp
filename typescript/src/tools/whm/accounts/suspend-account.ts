import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../../types.js";
import { textResult, errorResult } from "../../../types.js";
import { whm } from "../../../client/whm.js";

const schema = z.object({
  user: z.string().describe("cPanel username to suspend"),
  reason: z.string().optional().describe("Reason for suspension"),
});

export const whmSuspendAccount: McpAction = {
  tool: {
    name: "cpanel_whm_suspend_account",
    description: "Suspend a cPanel account, disabling access to all services.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { user, reason } = schema.parse(request.params.arguments);
    try {
      const params: Record<string, string> = { user };
      if (reason) params.reason = reason;
      const data = await whm("suspendacct", params);
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
