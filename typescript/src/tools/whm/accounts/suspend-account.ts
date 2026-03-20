import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../../types.js";
import { textResult, errorResult } from "../../../types.js";
import { whm } from "../../../client/whm.js";
import { cpanelUsernameSchema, sanitizeToolError } from "../../../validators.js";

const schema = z.object({
  user: cpanelUsernameSchema.describe("cPanel username to suspend"),
  reason: z
    .string()
    .max(512, "Reason exceeds maximum length of 512 characters")
    .refine((val) => !/[\x00-\x1f\x7f]/.test(val), "Reason must not contain control characters")
    .optional()
    .describe("Reason for suspension"),
});

export const whmSuspendAccount: McpAction = {
  tool: {
    name: "cpanel_whm_suspend_account",
    description: "Suspend a cPanel account, disabling access to all services.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { user, reason } = schema.parse(request.params.arguments);
      const params: Record<string, string> = { user };
      if (reason) params.reason = reason;
      const data = await whm("suspendacct", params);
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
