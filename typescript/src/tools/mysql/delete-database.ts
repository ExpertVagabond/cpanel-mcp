import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  name: z.string().describe("Full database name to delete"),
});

export const mysqlDeleteDatabase: McpAction = {
  tool: {
    name: "cpanel_mysql_delete_database",
    description: "Delete a MySQL database permanently.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { name } = schema.parse(request.params.arguments);
    try {
      const data = await uapi("Mysql", "delete_database", { name });
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
