import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";
import { emailSchema, passwordSchema, quotaSchema, sanitizeToolError } from "../../validators.js";

const schema = z.object({
  email: emailSchema.describe("Email address to create (user@domain.com)"),
  password: passwordSchema.describe("Password for the email account"),
  quota: quotaSchema.optional().describe("Mailbox quota in MB (0 for unlimited)"),
});

export const emailCreateAccount: McpAction = {
  tool: {
    name: "cpanel_email_create_account",
    description: "Create a new email account with password and optional quota.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { email, password, quota } = schema.parse(request.params.arguments);
      const params: Record<string, string> = { email, password };
      if (quota) params.quota = quota;
      const data = await uapi("Email", "add_pop", params);
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
