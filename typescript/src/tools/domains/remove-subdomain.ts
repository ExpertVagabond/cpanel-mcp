import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";
import { domainSchema, sanitizeToolError } from "../../validators.js";

const schema = z.object({
  domain: domainSchema.describe("Full subdomain to remove (e.g., blog.example.com)"),
});

export const domainsRemoveSubdomain: McpAction = {
  tool: {
    name: "cpanel_domains_remove_subdomain",
    description: "Remove a subdomain.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { domain } = schema.parse(request.params.arguments);
      const data = await uapi("SubDomain", "delsubdomain", { domain });
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
