import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  domain: z.string().describe("Full subdomain to remove (e.g., blog.example.com)"),
});

export const domainsRemoveSubdomain: McpAction = {
  tool: {
    name: "cpanel_domains_remove_subdomain",
    description: "Remove a subdomain.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { domain } = schema.parse(request.params.arguments);
    try {
      const data = await uapi("SubDomain", "delsubdomain", { domain });
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
