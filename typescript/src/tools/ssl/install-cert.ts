import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../types.js";
import { textResult, errorResult } from "../../types.js";
import { uapi } from "../../client/uapi.js";

const schema = z.object({
  domain: z.string().describe("Domain to install the certificate for"),
  cert: z.string().describe("PEM-encoded certificate"),
  key: z.string().describe("PEM-encoded private key"),
  cabundle: z.string().optional().describe("PEM-encoded CA bundle (intermediate certificates)"),
});

export const sslInstallCert: McpAction = {
  tool: {
    name: "cpanel_ssl_install_cert",
    description: "Install an SSL certificate for a domain.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { domain, cert, key, cabundle } = schema.parse(request.params.arguments);
    try {
      const params: Record<string, string> = { domain, cert, key };
      if (cabundle) params.cabundle = cabundle;
      const data = await uapi("SSL", "install_ssl", params);
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
