import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";
import { domainSchema, dnsRecordNameSchema, ttlSchema, numericStringSchema, sanitizeToolError } from "../../validators.js";

const schema = z.object({
  domain: domainSchema.describe("Domain zone to add the record to"),
  name: dnsRecordNameSchema.describe("Record name (e.g., subdomain.example.com.)"),
  type: z.enum(["A", "AAAA", "CNAME", "MX", "TXT", "SRV", "CAA"]).describe("DNS record type"),
  data: z.string().min(1, "Record data is required").max(4096, "Record data exceeds maximum length").describe("Record value/data"),
  ttl: ttlSchema.optional().describe("Time to live in seconds (default: 14400)"),
  priority: numericStringSchema("Priority").optional().describe("Priority (required for MX and SRV records)"),
});

export const dnsAddRecord: McpAction = {
  tool: {
    name: "cpanel_dns_add_record",
    description: "Add a DNS record (A, AAAA, CNAME, MX, TXT, SRV, CAA) to a domain zone.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { domain, name, type, data: rdata, ttl, priority } = schema.parse(request.params.arguments);
      // Require priority for MX and SRV records
      if ((type === "MX" || type === "SRV") && !priority) {
        return errorResult(`Priority is required for ${type} records`);
      }
      const serial = Date.now().toString();
      const params: Record<string, string> = {
        domain,
        "add.0.name": name,
        "add.0.type": type,
        "add.0.data": rdata,
        "add.0.ttl": ttl || "14400",
        serial,
      };
      if (priority) params["add.0.preference"] = priority;
      const result = await uapi("DNS", "mass_edit_zone", params);
      return textResult(result);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
