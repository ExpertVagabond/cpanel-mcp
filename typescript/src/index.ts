import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import type { McpAction } from "./types.js";
import { errorResult } from "./types.js";
import { validateConfig } from "./config.js";

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
for (const action of actions) {
  handlerMap.set(action.tool.name, action.handler);
}

function createServer() {
  const server = new Server(
    {
      name: "cpanel-mcp",
      version: "0.1.0",
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
    const handler = handlerMap.get(request.params.name);
    if (!handler) {
      return errorResult(`Unknown tool: ${request.params.name}`);
    }
    try {
      return await handler(request);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  });

  return server;
}

async function main() {
  validateConfig();
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`cpanel-mcp v0.1.0 running (${actions.length} tools)`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
