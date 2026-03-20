import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";
import { domainSchema, sanitizeToolError } from "../../validators.js";

const schema = z.object({
  domain: domainSchema.optional().describe("Filter by domain name"),
  regex: z
    .string()
    .max(256, "Regex filter exceeds maximum length")
    .refine(
      (val) => {
        try { new RegExp(val); return true; } catch { return false; }
      },
      "Invalid regular expression syntax",
    )
    .optional()
    .describe("Filter accounts matching regex"),
});

export const emailListAccounts: McpAction = {
  tool: {
    name: "cpanel_email_list_accounts",
    description: "List all email accounts for the cPanel user, including disk usage and quota information.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { domain, regex } = schema.parse(request.params.arguments);
      const params: Record<string, string> = {};
      if (domain) params.domain = domain;
      if (regex) params.regex = regex;
      const data = await uapi("Email", "list_pops_with_disk", params);
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
