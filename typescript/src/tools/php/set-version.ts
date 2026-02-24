import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  vhost: z.string().describe("Domain/vhost to set PHP version for"),
  version: z.string().describe("PHP version to set (e.g., ea-php81, ea-php82, ea-php83)"),
});

export const phpSetVersion: McpAction = {
  tool: {
    name: "cpanel_php_set_version",
    description: "Set the PHP version for a specific domain/vhost.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { vhost, version } = schema.parse(request.params.arguments);
    try {
      const data = await uapi("LangPHP", "php_set_vhost_versions", { vhost, version });
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
