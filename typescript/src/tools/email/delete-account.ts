import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  email: z.string().describe("Email address to delete (user@domain.com)"),
});

export const emailDeleteAccount: McpAction = {
  tool: {
    name: "cpanel_email_delete_account",
    description: "Delete an email account permanently.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { email } = schema.parse(request.params.arguments);
    try {
      const data = await uapi("Email", "delete_pop", { email });
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
