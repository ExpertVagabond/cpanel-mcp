import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../../types.js";
import { textResult, errorResult } from "../../../types.js";
import { whm } from "../../../client/whm.js";

const schema = z.object({});

export const whmServiceStatus: McpAction = {
  tool: {
    name: "cpanel_whm_service_status",
    description: "Check the status of all server services (Apache, MySQL, Exim, etc.).",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async () => {
    try {
      const data = await whm("servicestatus");
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
