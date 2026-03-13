import { config } from "../config.js";
import https from "node:https";

// Create a custom HTTPS agent for cPanel requests when SSL verification is disabled
// This scopes the TLS bypass to only cPanel API calls instead of the entire process
export const cpanelAgent = !config.verifySsl
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;

export class CpanelApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public raw?: unknown,
  ) {
    super(`cPanel API ${status}: ${message}`);
    this.name = "CpanelApiError";
  }
}

export async function request<T>(
  apiType: "uapi" | "whm",
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const port = apiType === "uapi" ? config.port : config.whmPort;
  const authPrefix = apiType === "uapi" ? "cpanel" : "whm";
  const authUser = apiType === "uapi" ? config.username : config.whmUsername;

  const url = new URL(`https://${config.host}:${port}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") {
        url.searchParams.set(k, v);
      }
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeout);

  try {
    const fetchOptions: RequestInit & { dispatcher?: unknown } = {
      headers: {
        Authorization: `${authPrefix} ${authUser}:${config.token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    };
    // Use scoped agent for TLS bypass instead of global process setting
    if (cpanelAgent) {
      (fetchOptions as Record<string, unknown>).dispatcher = cpanelAgent;
    }
    const res = await fetch(url.toString(), fetchOptions);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new CpanelApiError(res.status, body || res.statusText);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
