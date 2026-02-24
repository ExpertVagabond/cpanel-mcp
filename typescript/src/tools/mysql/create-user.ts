import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  name: z.string().describe("Username (will be prefixed with cPanel username)"),
  password: z.string().describe("Password for the MySQL user"),
});

export const mysqlCreateUser: McpAction = {
  tool: {
    name: "cpanel_mysql_create_user",
    description: "Create a new MySQL user with a password.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { name, password } = schema.parse(request.params.arguments);
    try {
      const data = await uapi("Mysql", "create_user", { name, password });
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
