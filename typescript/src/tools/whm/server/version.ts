import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../../types.js";
import { textResult, errorResult } from "../../../types.js";
import { whm } from "../../../client/whm.js";

const schema = z.object({});

export const whmVersion: McpAction = {
  tool: {
    name: "cpanel_whm_version",
    description: "Get the cPanel/WHM version information.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async () => {
    try {
      const data = await whm("version");
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
