import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  command: z.string().describe("Command to execute"),
  minute: z.string().describe("Minute (0-59 or *)"),
  hour: z.string().describe("Hour (0-23 or *)"),
  day: z.string().describe("Day of month (1-31 or *)"),
  month: z.string().describe("Month (1-12 or *)"),
  weekday: z.string().describe("Day of week (0-6, 0=Sunday, or *)"),
});

export const cronAddJob: McpAction = {
  tool: {
    name: "cpanel_cron_add_job",
    description: "Add a new cron job with a schedule and command.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { command, minute, hour, day, month, weekday } = schema.parse(request.params.arguments);
    try {
      const data = await uapi("CronJob", "add_line", { command, minute, hour, day, month, weekday });
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
