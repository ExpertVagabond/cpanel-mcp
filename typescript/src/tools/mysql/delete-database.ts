import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";
import { databaseNameSchema, sanitizeToolError } from "../../validators.js";

const schema = z.object({
  name: databaseNameSchema.describe("Full database name to delete"),
});

export const mysqlDeleteDatabase: McpAction = {
  tool: {
    name: "cpanel_mysql_delete_database",
    description: "Delete a MySQL database permanently.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { name } = schema.parse(request.params.arguments);
      const data = await uapi("Mysql", "delete_database", { name });
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
