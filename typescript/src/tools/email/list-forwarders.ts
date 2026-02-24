import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  domain: z.string().optional().describe("Filter forwarders by domain"),
});

export const emailListForwarders: McpAction = {
  tool: {
    name: "cpanel_email_list_forwarders",
    description: "List all email forwarders, optionally filtered by domain.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { domain } = schema.parse(request.params.arguments);
    try {
      const params: Record<string, string> = {};
      if (domain) params.domain = domain;
      const data = await uapi("Email", "list_forwarders", params);
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
