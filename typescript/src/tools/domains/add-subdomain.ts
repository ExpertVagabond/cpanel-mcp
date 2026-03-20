import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";
import { subdomainLabelSchema, domainSchema, safePathSchema, sanitizeToolError } from "../../validators.js";

const schema = z.object({
  domain: subdomainLabelSchema.describe("Subdomain name (e.g., 'blog' for blog.example.com)"),
  rootdomain: domainSchema.describe("Root domain (e.g., example.com)"),
  dir: safePathSchema.optional().describe("Document root directory (auto-generated if omitted)"),
});

export const domainsAddSubdomain: McpAction = {
  tool: {
    name: "cpanel_domains_add_subdomain",
    description: "Create a new subdomain under an existing domain.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { domain, rootdomain, dir } = schema.parse(request.params.arguments);
      const params: Record<string, string> = { domain, rootdomain };
      if (dir) params.dir = dir;
      const data = await uapi("SubDomain", "addsubdomain", params);
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
