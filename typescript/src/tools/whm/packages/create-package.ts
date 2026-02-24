import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { McpAction, ToolInputSchema } from "../../../types.js";
import { textResult, errorResult } from "../../../types.js";
import { whm } from "../../../client/whm.js";

const schema = z.object({
  name: z.string().describe("Package name"),
  quota: z.string().optional().describe("Disk quota in MB (0 for unlimited)"),
  bwlimit: z.string().optional().describe("Bandwidth limit in MB (0 for unlimited)"),
  maxftp: z.string().optional().describe("Max FTP accounts"),
  maxsql: z.string().optional().describe("Max MySQL databases"),
  maxpop: z.string().optional().describe("Max email accounts"),
  maxsub: z.string().optional().describe("Max subdomains"),
  maxaddon: z.string().optional().describe("Max addon domains"),
});

export const whmCreatePackage: McpAction = {
  tool: {
    name: "cpanel_whm_create_package",
    description: "Create a new hosting package with resource limits.",
    inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
  },
  handler: async (request) => {
    const { name, quota, bwlimit, maxftp, maxsql, maxpop, maxsub, maxaddon } = schema.parse(request.params.arguments);
    try {
      const params: Record<string, string> = { name };
      if (quota) params.quota = quota;
      if (bwlimit) params.bwlimit = bwlimit;
      if (maxftp) params.maxftp = maxftp;
      if (maxsql) params.maxsql = maxsql;
      if (maxpop) params.maxpop = maxpop;
      if (maxsub) params.maxsub = maxsub;
      if (maxaddon) params.maxaddon = maxaddon;
      const data = await whm("addpkg", params);
      return textResult(data);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
};
