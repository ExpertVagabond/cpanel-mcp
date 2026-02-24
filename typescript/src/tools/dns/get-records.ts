import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  domain: z.string().describe("Domain name to get DNS records for"),
});

export const dnsGetRecords: McpAction = {
  tool: {
    name: "cpanel_dns_get_records",
    description: "Get all DNS records for a specific domain zone.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { domain } = schema.parse(request.params.arguments);
    try {
      const data = await uapi("DNS", "parse_zone", { domain });
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
