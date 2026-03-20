import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";
import { domainSchema, sanitizeToolError } from "../../validators.js";

/** Basic PEM format validation — must start and end with PEM markers */
const pemSchema = z
  .string()
  .min(50, "PEM data is too short to be valid")
  .refine(
    (val) => /^-----BEGIN\s[\w\s]+-----/.test(val.trim()),
    "Must be PEM-encoded (expected -----BEGIN ... ----- header)",
  );

const schema = z.object({
  domain: domainSchema.describe("Domain to install the certificate for"),
  cert: pemSchema.describe("PEM-encoded certificate"),
  key: pemSchema.describe("PEM-encoded private key"),
  cabundle: pemSchema.optional().describe("PEM-encoded CA bundle (intermediate certificates)"),
});

export const sslInstallCert: McpAction = {
  tool: {
    name: "cpanel_ssl_install_cert",
    description: "Install an SSL certificate for a domain.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    try {
      const { domain, cert, key, cabundle } = schema.parse(request.params.arguments);
      const params: Record<string, string> = { domain, cert, key };
      if (cabundle) params.cabundle = cabundle;
      const data = await uapi("SSL", "install_ssl", params);
      return textResult(data);
    } catch (e) {
      return errorResult(sanitizeToolError(e));
    }
  },
};
