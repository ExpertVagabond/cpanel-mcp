import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  domain: z.string().describe("Domain for the forwarder"),
  email: z.string().describe("Source email address (local part or full address)"),
  fwdopt: z.enum(["fwd", "fail", "blackhole", "pipe"]).describe("Forward action type"),
  fwdemail: z.string().optional().describe("Destination email address (required when fwdopt=fwd)"),
});

export const emailCreateForwarder: McpAction = {
  tool: {
    name: "cpanel_email_create_forwarder",
    description: "Create an email forwarder to redirect messages to another address.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { domain, email, fwdopt, fwdemail } = schema.parse(request.params.arguments);
    try {
      const params: Record<string, string> = { domain, email, fwdopt };
      if (fwdemail) params.fwdemail = fwdemail;
      const data = await uapi("Email", "add_forwarder", params);
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
