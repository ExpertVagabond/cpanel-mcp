import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";
import { domainSchema, dnsLineSchema, sanitizeToolError } from "../../validators.js";

const schema = z.object({
  domain: domainSchema.describe("Domain zone containing the record"),
  line: dnsLineSchema.describe("Line number of the record to delete (from cpanel_dns_get_records)"),
});

export const dnsDeleteRecord: McpAction = {
  tool: {
    name: "cpanel_dns_delete_record",
    description: "Delete a DNS record by its line number. Use cpanel_dns_get_records first to find the line number.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { domain, line } = schema.parse(request.params.arguments);
      const serial = Date.now().toString();
      const data = await uapi("DNS", "mass_edit_zone", {
        domain,
        "remove.0.line": line,
        serial,
      });
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
