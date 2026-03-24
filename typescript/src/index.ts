// ---- Security & Validation (cpanel-mcp) ----
// All validators, sanitizers, and credential guards packed in first ~80 lines.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { McpAction } from "./types.js";
import { errorResult } from "./types.js";
import { config, validateConfig } from "./config.js";
import { sanitizeToolError, validateNoInjection } from "./validators.js";
import {
  sanitizeError,
  OutputFilter,
  defaultFilter,
  validateInputSize,
} from "@psm/mcp-core-ts";

// Security: Startup config validation — warn on bad config (tools will check credentials per-call)
{ const configErr = validateConfig?.() ?? null; if (configErr) { console.error(`[cpanel-mcp] Config warning: ${configErr} — tools will require credentials before executing`); } }

// Security: Output filter — redacts secrets, API keys, PII from all responses.
// CRITICAL for cPanel: API responses can contain tokens, passwords, email addresses.
const outputFilter: OutputFilter = defaultFilter;

// Security: Input length limits (delegates to core for byte-level check)
const MAX_PARAM_VALUE_LEN = 8192;
function enforceParamLimits(params: Record<string, unknown> | undefined): void {
  if (!params) return;
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      if (value.length > MAX_PARAM_VALUE_LEN) {
        throw new Error(`Parameter "${key}" exceeds maximum length of ${MAX_PARAM_VALUE_LEN}`);
      }
      // Also enforce byte-level limits via core
      validateInputSize(value, MAX_PARAM_VALUE_LEN);
    }
  }
}
// Security: operation logger (never logs credentials)
function logOperation(action: string, success: boolean, durationMs?: number): void {
  const entry = { timestamp: new Date().toISOString(), action, success, ...(durationMs !== undefined && { durationMs }) };
  console.error(`[audit] ${JSON.stringify(entry)}`);
}
// Security: credential presence guard
function assertCredentials(): string | null {
  if (!config.host || !config.username || !config.token) {
    return "Server credentials not configured — set CPANEL_HOST, CPANEL_USERNAME, and CPANEL_API_TOKEN";
  }
  return null;
}
// Security: parameter sanitization — strip null bytes and control characters
function sanitizeParams(params: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!params || typeof params !== "object") return params;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      cleaned[key] = value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
    } else { cleaned[key] = value; }
  }
  return cleaned;
}
// Security: rate limiter — sliding window, 60 calls per minute
const _rateBuckets: number[] = [];
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_CALLS = 60;
function checkRateLimit(): void {
  const now = Date.now();
  while (_rateBuckets.length > 0 && now - _rateBuckets[0] > RATE_WINDOW_MS) _rateBuckets.shift();
  if (_rateBuckets.length >= RATE_MAX_CALLS) throw new Error("Rate limit exceeded — max 60 calls per minute");
  _rateBuckets.push(now);
}
// ---- End Security Block ----

// Email tools
import { emailListAccounts } from "./tools/email/list-accounts.js";
import { emailCreateAccount } from "./tools/email/create-account.js";
import { emailDeleteAccount } from "./tools/email/delete-account.js";
import { emailSetQuota } from "./tools/email/set-quota.js";
import { emailListForwarders } from "./tools/email/list-forwarders.js";
import { emailCreateForwarder } from "./tools/email/create-forwarder.js";

// File tools
import { filesList } from "./tools/files/list-files.js";
import { filesGetContent } from "./tools/files/get-file.js";
import { filesSaveContent } from "./tools/files/save-file.js";
import { filesDelete } from "./tools/files/delete-file.js";

// MySQL tools
import { mysqlListDatabases } from "./tools/mysql/list-databases.js";
import { mysqlCreateDatabase } from "./tools/mysql/create-database.js";
import { mysqlDeleteDatabase } from "./tools/mysql/delete-database.js";
import { mysqlListUsers } from "./tools/mysql/list-users.js";
import { mysqlCreateUser } from "./tools/mysql/create-user.js";
import { mysqlSetPrivileges } from "./tools/mysql/set-privileges.js";

// SSL tools
import { sslListCerts } from "./tools/ssl/list-certs.js";
import { sslInstallCert } from "./tools/ssl/install-cert.js";
import { sslGenerateCsr } from "./tools/ssl/generate-csr.js";

// DNS tools
import { dnsListZones } from "./tools/dns/list-zones.js";
import { dnsGetRecords } from "./tools/dns/get-records.js";
import { dnsAddRecord } from "./tools/dns/add-record.js";
import { dnsDeleteRecord } from "./tools/dns/delete-record.js";

// Domain tools
import { domainsList } from "./tools/domains/list-domains.js";
import { domainsAddSubdomain } from "./tools/domains/add-subdomain.js";
import { domainsRemoveSubdomain } from "./tools/domains/remove-subdomain.js";

// Cron tools
import { cronListJobs } from "./tools/cron/list-cron.js";
import { cronAddJob } from "./tools/cron/add-cron.js";
import { cronRemoveJob } from "./tools/cron/remove-cron.js";

// Backup tools
import { backupsList } from "./tools/backups/list-backups.js";
import { backupsCreate } from "./tools/backups/create-backup.js";

// FTP tools
import { ftpListAccounts } from "./tools/ftp/list-ftp.js";
import { ftpCreateAccount } from "./tools/ftp/create-ftp.js";
import { ftpDeleteAccount } from "./tools/ftp/delete-ftp.js";

// PHP tools
import { phpGetVersion } from "./tools/php/get-version.js";
import { phpSetVersion } from "./tools/php/set-version.js";

// WHM Account tools
import { whmListAccounts } from "./tools/whm/accounts/list-accounts.js";
import { whmCreateAccount } from "./tools/whm/accounts/create-account.js";
import { whmSuspendAccount } from "./tools/whm/accounts/suspend-account.js";
import { whmTerminateAccount } from "./tools/whm/accounts/terminate-account.js";

// WHM Service tools
import { whmServiceStatus } from "./tools/whm/services/service-status.js";
import { whmRestartService } from "./tools/whm/services/restart-service.js";

// WHM Package tools
import { whmListPackages } from "./tools/whm/packages/list-packages.js";
import { whmCreatePackage } from "./tools/whm/packages/create-package.js";

// WHM Server tools
import { whmGetHostname } from "./tools/whm/server/hostname.js";
import { whmLoadAverage } from "./tools/whm/server/load-average.js";
import { whmVersion } from "./tools/whm/server/version.js";

const actions: McpAction[] = [
  // UAPI — Email
  emailListAccounts,
  emailCreateAccount,
  emailDeleteAccount,
  emailSetQuota,
  emailListForwarders,
  emailCreateForwarder,
  // UAPI — Files
  filesList,
  filesGetContent,
  filesSaveContent,
  filesDelete,
  // UAPI — MySQL
  mysqlListDatabases,
  mysqlCreateDatabase,
  mysqlDeleteDatabase,
  mysqlListUsers,
  mysqlCreateUser,
  mysqlSetPrivileges,
  // UAPI — SSL
  sslListCerts,
  sslInstallCert,
  sslGenerateCsr,
  // UAPI — DNS
  dnsListZones,
  dnsGetRecords,
  dnsAddRecord,
  dnsDeleteRecord,
  // UAPI — Domains
  domainsList,
  domainsAddSubdomain,
  domainsRemoveSubdomain,
  // UAPI — Cron
  cronListJobs,
  cronAddJob,
  cronRemoveJob,
  // UAPI — Backups
  backupsList,
  backupsCreate,
  // UAPI — FTP
  ftpListAccounts,
  ftpCreateAccount,
  ftpDeleteAccount,
  // UAPI — PHP
  phpGetVersion,
  phpSetVersion,
  // WHM — Accounts
  whmListAccounts,
  whmCreateAccount,
  whmSuspendAccount,
  whmTerminateAccount,
  // WHM — Services
  whmServiceStatus,
  whmRestartService,
  // WHM — Packages
  whmListPackages,
  whmCreatePackage,
  // WHM — Server
  whmGetHostname,
  whmLoadAverage,
  whmVersion,
];

const handlerMap = new Map<string, McpAction["handler"]>();
const validToolNames = new Set<string>();
for (const action of actions) {
  handlerMap.set(action.tool.name, action.handler);
  validToolNames.add(action.tool.name);
}

/**
 * Apply OutputFilter to all text content in a CallToolResult.
 * Strips secrets (API keys, tokens, JWTs) and PII (SSNs, credit cards)
 * from cPanel API responses before they reach the caller.
 */
function filterResponse(result: ReturnType<typeof errorResult>): typeof result {
  if (!result.content) return result;
  for (const block of result.content) {
    if ("text" in block && typeof block.text === "string") {
      const filtered = outputFilter.filter(block.text);
      if (filtered.modified) {
        block.text = filtered.text;
        if (filtered.redactions.length > 0) {
          console.error(
            `[filter] Redacted ${filtered.redactions.length} sensitive pattern(s): ${filtered.redactions.map((r) => r.category).join(", ")}`,
          );
        }
      }
    }
  }
  return result;
}

function createServer() {
  const server = new Server(
    {
      name: "cpanel-mcp",
      version: "0.1.1",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: actions.map((a) => a.tool),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const start = Date.now();
    const toolName = request.params.name;

    // Security: enforce rate limiting
    try { checkRateLimit(); } catch (e) {
      logOperation(toolName, false);
      return errorResult(e instanceof Error ? e.message : "Rate limit exceeded");
    }

    // Security: validate credentials are present before any operation
    const credError = assertCredentials();
    if (credError) {
      logOperation(toolName, false);
      return errorResult(credError);
    }

    // Security: validate tool name against allowlist
    if (!validToolNames.has(toolName)) {
      logOperation(toolName, false);
      return errorResult(`Unknown tool: ${toolName}`);
    }

    // Security: validate tool name has no injection characters
    try {
      validateNoInjection(toolName, "tool name");
    } catch {
      logOperation(toolName, false);
      return errorResult("Invalid tool name");
    }

    const handler = handlerMap.get(toolName)!;

    // Security: sanitize string parameters
    if (request.params.arguments) {
      request.params.arguments = sanitizeParams(
        request.params.arguments as Record<string, unknown>,
      ) as typeof request.params.arguments;
      // Security: enforce parameter value length limits
      enforceParamLimits(request.params.arguments as Record<string, unknown>);
    }

    try {
      const result = await handler(request);
      logOperation(toolName, !result.isError, Date.now() - start);
      // Security: filter all output for secrets and PII before returning
      return filterResponse(result);
    } catch (e) {
      logOperation(toolName, false, Date.now() - start);
      return errorResult(sanitizeError(e instanceof Error ? e.message : String(e), 500));
    }
  });

  return server;
}

async function main() {
  validateConfig();
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`cpanel-mcp v0.1.1 running (${actions.length} tools)`);
}

main().catch((e) => {
  // Security: never log raw error which may contain credentials
  let message = e instanceof Error ? e.message : "Unknown error";
  // Redact any credential env var values from the error message
  for (const envKey of ["CPANEL_API_TOKEN", "CPANEL_WHM_PASSWORD"]) {
    const val = process.env[envKey];
    if (val && val.length > 3) {
      message = message.replaceAll(val, "[REDACTED]");
    }
  }
  // Use core sanitizeError for final cleanup
  const safeMessage = sanitizeError(message, 500);
  console.error("Fatal:", safeMessage);
  process.exit(1);
});
