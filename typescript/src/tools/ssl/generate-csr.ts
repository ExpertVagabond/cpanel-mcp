import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";
import { domainSchema, emailSchema, countryCodeSchema, sanitizeToolError } from "../../validators.js";

/** Safe text field: no control characters, reasonable length */
const safeTextField = (fieldName: string) =>
  z
    .string()
    .min(1, `${fieldName} is required`)
    .max(128, `${fieldName} exceeds maximum length of 128 characters`)
    .refine((val) => !/[\x00-\x1f\x7f]/.test(val), `${fieldName} must not contain control characters`);

const schema = z.object({
  domains: domainSchema.describe("Domain name for the CSR"),
  city: safeTextField("City").describe("City/locality"),
  state: safeTextField("State").describe("State/province"),
  country: countryCodeSchema.describe("Two-letter country code (e.g., US)"),
  company: safeTextField("Company").describe("Organization/company name"),
  email: emailSchema.describe("Contact email address"),
});

export const sslGenerateCsr: McpAction = {
  tool: {
    name: "cpanel_ssl_generate_csr",
    description: "Generate a Certificate Signing Request (CSR) for a domain.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { domains, city, state, country, company, email } = schema.parse(request.params.arguments);
      const data = await uapi("SSL", "generate_csr", { domains, city, state, country, company, email });
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
