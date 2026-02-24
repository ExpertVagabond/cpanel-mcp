import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({});

export const phpGetVersion: McpAction = {
  tool: {
    name: "cpanel_php_get_version",
    description: "Get the PHP version configured for each domain/vhost.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async () => {
    try {
      const data = await uapi("LangPHP", "php_get_vhost_versions");
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
