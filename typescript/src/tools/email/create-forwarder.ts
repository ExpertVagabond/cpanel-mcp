import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";
import { domainSchema, emailSchema, sanitizeToolError } from "../../validators.js";

const schema = z.object({
  domain: domainSchema.describe("Domain for the forwarder"),
  email: z
    .string()
    .min(1, "Source email is required")
    .max(254, "Source email address exceeds maximum length")
    .regex(/^[a-zA-Z0-9._%+-]+(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})?$/, "Invalid source email — provide the local part or full address")
    .describe("Source email address (local part or full address)"),
  fwdopt: z.enum(["fwd", "fail", "blackhole", "pipe"]).describe("Forward action type"),
  fwdemail: emailSchema.optional().describe("Destination email address (required when fwdopt=fwd)"),
});

export const emailCreateForwarder: McpAction = {
  tool: {
    name: "cpanel_email_create_forwarder",
    description: "Create an email forwarder to redirect messages to another address.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { domain, email, fwdopt, fwdemail } = schema.parse(request.params.arguments);
      // Require fwdemail when forwarding
      if (fwdopt === "fwd" && !fwdemail) {
        return errorResult("Destination email (fwdemail) is required when fwdopt is 'fwd'");
      }
      const params: Record<string, string> = { domain, email, fwdopt };
      if (fwdemail) params.fwdemail = fwdemail;
      const data = await uapi("Email", "add_forwarder", params);
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
