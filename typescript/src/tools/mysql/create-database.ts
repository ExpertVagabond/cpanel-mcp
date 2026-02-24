import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  name: z.string().describe("Database name (will be prefixed with cPanel username)"),
});

export const mysqlCreateDatabase: McpAction = {
  tool: {
    name: "cpanel_mysql_create_database",
    description: "Create a new MySQL database. The name will be automatically prefixed with the cPanel username.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { name } = schema.parse(request.params.arguments);
    try {
      const data = await uapi("Mysql", "create_database", { name });
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
