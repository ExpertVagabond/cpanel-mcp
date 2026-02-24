import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  user: z.string().describe("MySQL username"),
  database: z.string().describe("Database name"),
  privileges: z.string().describe("Comma-separated privileges (ALL PRIVILEGES, SELECT, INSERT, UPDATE, DELETE, etc.)"),
});

export const mysqlSetPrivileges: McpAction = {
  tool: {
    name: "cpanel_mysql_set_privileges",
    description: "Grant privileges to a MySQL user on a specific database.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { user, database, privileges } = schema.parse(request.params.arguments);
    try {
      const data = await uapi("Mysql", "set_privileges_on_database", { user, database, privileges });
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
