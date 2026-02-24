import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../../types.js";
import { textResult, errorResult } from "../../../types.js";
import { whm } from "../../../client/whm.js";

const schema = z.object({
  searchtype: z.string().optional().describe("Search field: domain, owner, user, ip, package"),
  search: z.string().optional().describe("Search value to filter accounts"),
});

export const whmListAccounts: McpAction = {
  tool: {
    name: "cpanel_whm_list_accounts",
    description: "List all cPanel accounts on the server. Optionally filter by domain, owner, user, IP, or package.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { searchtype, search } = schema.parse(request.params.arguments);
    try {
      const params: Record<string, string> = {};
      if (searchtype) params.searchtype = searchtype;
      if (search) params.search = search;
      const data = await whm("listaccts", params);
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
