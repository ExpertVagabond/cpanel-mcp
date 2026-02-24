import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  linekey: z.string().describe("Cron job line key (from cpanel_cron_list_jobs)"),
});

export const cronRemoveJob: McpAction = {
  tool: {
    name: "cpanel_cron_remove_job",
    description: "Remove a cron job by its line key. Use cpanel_cron_list_jobs first to find the line key.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { linekey } = schema.parse(request.params.arguments);
    try {
      const data = await uapi("CronJob", "remove_line", { linekey });
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
