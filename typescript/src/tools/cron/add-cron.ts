import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";
import { cronFieldSchema, cronCommandSchema, sanitizeToolError } from "../../validators.js";

const schema = z.object({
  command: cronCommandSchema.describe("Command to execute"),
  minute: cronFieldSchema("minute", 0, 59).describe("Minute (0-59 or *)"),
  hour: cronFieldSchema("hour", 0, 23).describe("Hour (0-23 or *)"),
  day: cronFieldSchema("day", 1, 31).describe("Day of month (1-31 or *)"),
  month: cronFieldSchema("month", 1, 12).describe("Month (1-12 or *)"),
  weekday: cronFieldSchema("weekday", 0, 6).describe("Day of week (0-6, 0=Sunday, or *)"),
});

export const cronAddJob: McpAction = {
  tool: {
    name: "cpanel_cron_add_job",
    description: "Add a new cron job with a schedule and command.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { command, minute, hour, day, month, weekday } = schema.parse(request.params.arguments);
      const data = await uapi("CronJob", "add_line", { command, minute, hour, day, month, weekday });
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
