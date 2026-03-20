import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../../types.js";
import { textResult, errorResult } from "../../../types.js";
import { whm } from "../../../client/whm.js";
import { cpanelUsernameSchema, domainSchema, passwordSchema, packageNameSchema, quotaSchema, emailSchema, sanitizeToolError } from "../../../validators.js";

const schema = z.object({
  username: cpanelUsernameSchema.describe("cPanel username (max 16 chars)"),
  domain: domainSchema.describe("Primary domain for the account"),
  password: passwordSchema.optional().describe("Account password (auto-generated if omitted)"),
  plan: packageNameSchema.optional().describe("Hosting package name"),
  quota: quotaSchema.optional().describe("Disk quota in MB (0 for unlimited)"),
  bwlimit: quotaSchema.optional().describe("Bandwidth limit in MB (0 for unlimited)"),
  contactemail: emailSchema.optional().describe("Contact email for the account owner"),
});

export const whmCreateAccount: McpAction = {
  tool: {
    name: "cpanel_whm_create_account",
    description: "Create a new cPanel account with a domain and optional hosting package.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { username, domain, password, plan, quota, bwlimit, contactemail } = schema.parse(request.params.arguments);
      const params: Record<string, string> = { username, domain };
      if (password) params.password = password;
      if (plan) params.plan = plan;
      if (quota) params.quota = quota;
      if (bwlimit) params.bwlimit = bwlimit;
      if (contactemail) params.contactemail = contactemail;
      const data = await whm("createacct", params);
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
