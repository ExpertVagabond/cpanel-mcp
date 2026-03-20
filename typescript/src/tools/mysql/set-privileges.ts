import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";
import { serviceUsernameSchema, databaseNameSchema, privilegesSchema, sanitizeToolError } from "../../validators.js";

const schema = z.object({
  user: serviceUsernameSchema.describe("MySQL username"),
  database: databaseNameSchema.describe("Database name"),
  privileges: privilegesSchema.describe("Comma-separated privileges (ALL PRIVILEGES, SELECT, INSERT, UPDATE, DELETE, etc.)"),
});

export const mysqlSetPrivileges: McpAction = {
  tool: {
    name: "cpanel_mysql_set_privileges",
    description: "Grant privileges to a MySQL user on a specific database.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { user, database, privileges } = schema.parse(request.params.arguments);
      const data = await uapi("Mysql", "set_privileges_on_database", { user, database, privileges });
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
