import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({});

export const mysqlListDatabases: McpAction = {
  tool: {
    name: "cpanel_mysql_list_databases",
    description: "List all MySQL databases for the cPanel account.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async () => {
    try {
      const data = await uapi("Mysql", "list_databases");
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
