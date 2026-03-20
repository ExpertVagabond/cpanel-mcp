import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../../types.js";
import { textResult, errorResult } from "../../../types.js";
import { whm } from "../../../client/whm.js";
import { sanitizeToolError } from "../../../validators.js";

const schema = z.object({
  searchtype: z.enum(["domain", "owner", "user", "ip", "package"]).optional().describe("Search field: domain, owner, user, ip, package"),
  search: z
    .string()
    .max(253, "Search value exceeds maximum length")
    .regex(/^[a-zA-Z0-9._@:/-]*$/, "Search value contains invalid characters")
    .optional()
    .describe("Search value to filter accounts"),
});

export const whmListAccounts: McpAction = {
  tool: {
    name: "cpanel_whm_list_accounts",
    description: "List all cPanel accounts on the server. Optionally filter by domain, owner, user, IP, or package.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { searchtype, search } = schema.parse(request.params.arguments);
      const params: Record<string, string> = {};
      if (searchtype) params.searchtype = searchtype;
      if (search) params.search = search;
      const data = await whm("listaccts", params);
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
