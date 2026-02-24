import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  domain: z.string().optional().describe("Filter by domain name"),
  regex: z.string().optional().describe("Filter accounts matching regex"),
});

export const emailListAccounts: McpAction = {
  tool: {
    name: "cpanel_email_list_accounts",
    description: "List all email accounts for the cPanel user, including disk usage and quota information.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { domain, regex } = schema.parse(request.params.arguments);
    try {
      const params: Record<string, string> = {};
      if (domain) params.domain = domain;
      if (regex) params.regex = regex;
      const data = await uapi("Email", "list_pops_with_disk", params);
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
