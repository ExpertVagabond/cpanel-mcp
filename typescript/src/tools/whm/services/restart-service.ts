import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../../types.js";
import { textResult, errorResult } from "../../../types.js";
import { whm } from "../../../client/whm.js";

const schema = z.object({
  service: z.enum(["httpd", "mysql", "exim", "named", "ftpd", "dovecot", "spamd", "clamd", "cpanel", "cpsrvd"]).describe("Service to restart"),
});

export const whmRestartService: McpAction = {
  tool: {
    name: "cpanel_whm_restart_service",
    description: "Restart a specific server service (httpd, mysql, exim, named, ftpd, dovecot, etc.).",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { service } = schema.parse(request.params.arguments);
    try {
      const data = await whm("restartservice", { service });
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
