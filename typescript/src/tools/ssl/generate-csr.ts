import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  domains: z.string().describe("Domain name for the CSR"),
  city: z.string().describe("City/locality"),
  state: z.string().describe("State/province"),
  country: z.string().describe("Two-letter country code (e.g., US)"),
  company: z.string().describe("Organization/company name"),
  email: z.string().describe("Contact email address"),
});

export const sslGenerateCsr: McpAction = {
  tool: {
    name: "cpanel_ssl_generate_csr",
    description: "Generate a Certificate Signing Request (CSR) for a domain.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { domains, city, state, country, company, email } = schema.parse(request.params.arguments);
    try {
      const data = await uapi("SSL", "generate_csr", { domains, city, state, country, company, email });
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
