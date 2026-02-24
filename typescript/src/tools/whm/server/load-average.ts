import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../../types.js";
import { textResult, errorResult } from "../../../types.js";
import { whm } from "../../../client/whm.js";

const schema = z.object({});

export const whmLoadAverage: McpAction = {
  tool: {
    name: "cpanel_whm_load_average",
    description: "Get the current server load average (1, 5, and 15 minute averages).",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async () => {
    try {
      const data = await whm("loadavg");
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
