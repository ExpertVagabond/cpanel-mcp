import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../../types.js";
import { textResult, errorResult } from "../../../types.js";
import { whm } from "../../../client/whm.js";

const schema = z.object({
  username: z.string().describe("cPanel username (max 8 chars on some systems)"),
  domain: z.string().describe("Primary domain for the account"),
  password: z.string().optional().describe("Account password (auto-generated if omitted)"),
  plan: z.string().optional().describe("Hosting package name"),
  quota: z.string().optional().describe("Disk quota in MB (0 for unlimited)"),
  bwlimit: z.string().optional().describe("Bandwidth limit in MB (0 for unlimited)"),
  contactemail: z.string().optional().describe("Contact email for the account owner"),
});

export const whmCreateAccount: McpAction = {
  tool: {
    name: "cpanel_whm_create_account",
    description: "Create a new cPanel account with a domain and optional hosting package.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { username, domain, password, plan, quota, bwlimit, contactemail } = schema.parse(request.params.arguments);
    try {
      const params: Record<string, string> = { username, domain };
      if (password) params.password = password;
      if (plan) params.plan = plan;
      if (quota) params.quota = quota;
      if (bwlimit) params.bwlimit = bwlimit;
      if (contactemail) params.contactemail = contactemail;
      const data = await whm("createacct", params);
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
