import { config } from "../config.js";

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
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `${authPrefix} ${authUser}:${config.token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      // @ts-expect-error Node 18+ undici option for self-signed certs
      dispatcher: config.verifySsl
        ? undefined
        : new (await import("node:https")).Agent({ rejectUnauthorized: false }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new CpanelApiError(res.status, body || res.statusText);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
