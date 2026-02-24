import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  email: z.string().describe("Email address (user@domain.com)"),
  quota: z.string().describe("New quota in MB (0 for unlimited)"),
});

export const emailSetQuota: McpAction = {
  tool: {
    name: "cpanel_email_set_quota",
    description: "Update the mailbox size quota for an email account.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { email, quota } = schema.parse(request.params.arguments);
    try {
      const data = await uapi("Email", "edit_pop_quota", { email, quota });
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
