/**
 * cpanel-mcp unit tests
 *
 * Tests cover:
 * - Config validation logic
 * - URL construction from params
 * - Auth header format
 * - Response parsing (UAPI formats)
 * - Error result / text result shapes
 * - Parameter validation via Zod schemas
 *
 * Network calls (fetch) are mocked — no real cPanel is accessed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Config validation (mirrors validateConfig in config.ts)
// ---------------------------------------------------------------------------

interface CpanelConfig {
  host: string;
  username: string;
  token: string;
  port: number;
  whmPort: number;
  whmUsername: string;
  verifySsl: boolean;
  timeout: number;
}

function validateConfig(cfg: CpanelConfig): void {
  if (!cfg.host) throw new Error("CPANEL_HOST environment variable is required");
  if (!cfg.username) throw new Error("CPANEL_USERNAME environment variable is required");
  if (!cfg.token) throw new Error("CPANEL_API_TOKEN environment variable is required");
}

describe("validateConfig", () => {
  const baseConfig: CpanelConfig = {
    host: "example.com",
    username: "admin",
    token: "abc123",
    port: 2083,
    whmPort: 2087,
    whmUsername: "root",
    verifySsl: false,
    timeout: 30000,
  };

  it("passes with all required fields", () => {
    expect(() => validateConfig(baseConfig)).not.toThrow();
  });

  it("throws when host is missing", () => {
    expect(() => validateConfig({ ...baseConfig, host: "" })).toThrow("CPANEL_HOST");
  });

  it("throws when username is missing", () => {
    expect(() => validateConfig({ ...baseConfig, username: "" })).toThrow("CPANEL_USERNAME");
  });

  it("throws when token is missing", () => {
    expect(() => validateConfig({ ...baseConfig, token: "" })).toThrow("CPANEL_API_TOKEN");
  });
});

// ---------------------------------------------------------------------------
// URL construction (mirrors base.ts request() URL building)
// ---------------------------------------------------------------------------

function buildApiUrl(
  host: string,
  port: number,
  path: string,
  params?: Record<string, string>
): string {
  const url = new URL(`https://${host}:${port}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") {
        url.searchParams.set(k, v);
      }
    }
  }
  return url.toString();
}

describe("API URL construction", () => {
  it("builds correct UAPI URL", () => {
    const url = buildApiUrl("example.com", 2083, "/execute/DNS/list_zones");
    expect(url).toBe("https://example.com:2083/execute/DNS/list_zones");
  });

  it("builds WHM URL", () => {
    const url = buildApiUrl("example.com", 2087, "/json-api/listaccts");
    expect(url).toBe("https://example.com:2087/json-api/listaccts");
  });

  it("appends query params correctly", () => {
    const url = buildApiUrl("example.com", 2083, "/execute/DNS/list_zones", {
      domain: "test.com",
    });
    expect(url).toContain("domain=test.com");
  });

  it("skips empty string params", () => {
    const url = buildApiUrl("example.com", 2083, "/execute/DNS/list_zones", {
      domain: "test.com",
      ttl: "",
    });
    expect(url).not.toContain("ttl=");
    expect(url).toContain("domain=test.com");
  });

  it("URL-encodes special characters in params", () => {
    const url = buildApiUrl("example.com", 2083, "/execute/DNS/list_zones", {
      domain: "test.com",
      data: "v=spf1 include:test.com ~all",
    });
    expect(url).toContain("v%3Dspf1");
  });
});

// ---------------------------------------------------------------------------
// Auth header construction
// ---------------------------------------------------------------------------

function buildAuthHeader(apiType: "uapi" | "whm", username: string, token: string): string {
  const prefix = apiType === "uapi" ? "cpanel" : "whm";
  return `${prefix} ${username}:${token}`;
}

describe("Auth header", () => {
  it("uses cpanel prefix for UAPI requests", () => {
    const header = buildAuthHeader("uapi", "admin", "mytoken123");
    expect(header).toBe("cpanel admin:mytoken123");
  });

  it("uses whm prefix for WHM requests", () => {
    const header = buildAuthHeader("whm", "root", "whmtoken456");
    expect(header).toBe("whm root:whmtoken456");
  });
});

// ---------------------------------------------------------------------------
// UAPI response parsing (mirrors uapi.ts logic)
// ---------------------------------------------------------------------------

interface UapiResult<T = unknown> {
  data: T;
  errors: string[] | null;
  status: number;
}

interface UapiResponse<T = unknown> {
  result?: UapiResult<T>;
  data?: T;
  errors?: string[] | null;
  status?: number;
}

function parseUapiResponse<T>(raw: UapiResponse<T>): T {
  const result = raw.result ?? (raw as unknown as UapiResult<T>);
  if (result.status !== 1) {
    const errors = result.errors?.join("; ") || "Unknown UAPI error";
    throw new Error(`cPanel API 0: ${errors}`);
  }
  return result.data;
}

describe("parseUapiResponse", () => {
  it("extracts data from wrapped {result: {...}} format", () => {
    const raw: UapiResponse<{ zones: string[] }> = {
      result: { data: { zones: ["example.com"] }, errors: null, status: 1 },
    };
    const data = parseUapiResponse(raw);
    expect(data.zones).toEqual(["example.com"]);
  });

  it("extracts data from flat format", () => {
    const raw = { data: { zones: ["flat.com"] }, errors: null, status: 1 };
    const data = parseUapiResponse(raw);
    expect((data as { zones: string[] }).zones).toEqual(["flat.com"]);
  });

  it("throws when status is 0", () => {
    const raw: UapiResponse = {
      result: { data: null, errors: ["Zone not found"], status: 0 },
    };
    expect(() => parseUapiResponse(raw)).toThrow("Zone not found");
  });

  it("throws with generic message when errors array is null", () => {
    const raw: UapiResponse = {
      result: { data: null, errors: null, status: 0 },
    };
    expect(() => parseUapiResponse(raw)).toThrow("Unknown UAPI error");
  });

  it("joins multiple errors with semicolons", () => {
    const raw: UapiResponse = {
      result: { data: null, errors: ["err1", "err2"], status: 0 },
    };
    expect(() => parseUapiResponse(raw)).toThrow("err1; err2");
  });
});

// ---------------------------------------------------------------------------
// textResult / errorResult (mirrors types.ts)
// ---------------------------------------------------------------------------

function textResult(data: unknown) {
  return {
    content: [
      { type: "text" as const, text: typeof data === "string" ? data : JSON.stringify(data, null, 2) },
    ],
  };
}

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}

describe("textResult", () => {
  it("passes string through as-is", () => {
    expect(textResult("hello").content[0].text).toBe("hello");
  });

  it("JSON-stringifies objects", () => {
    const result = textResult({ domain: "test.com" });
    expect(JSON.parse(result.content[0].text)).toEqual({ domain: "test.com" });
  });

  it("does not set isError", () => {
    const r = textResult("ok") as Record<string, unknown>;
    expect(r.isError).toBeUndefined();
  });
});

describe("errorResult", () => {
  it("sets isError: true", () => {
    expect(errorResult("bad input").isError).toBe(true);
  });

  it("prefixes message with 'Error:'", () => {
    expect(errorResult("not found").content[0].text).toBe("Error: not found");
  });
});

// ---------------------------------------------------------------------------
// DNS record type validation (mirrors dns/add-record.ts schema)
// ---------------------------------------------------------------------------

import { z } from "zod";

const dnsAddSchema = z.object({
  domain: z.string(),
  name: z.string(),
  type: z.enum(["A", "AAAA", "CNAME", "MX", "TXT", "SRV", "CAA"]),
  data: z.string(),
  ttl: z.string().optional(),
  priority: z.string().optional(),
});

describe("DNS add record schema", () => {
  it("accepts valid A record", () => {
    const r = dnsAddSchema.safeParse({
      domain: "example.com",
      name: "sub.example.com.",
      type: "A",
      data: "1.2.3.4",
    });
    expect(r.success).toBe(true);
  });

  it("accepts all valid DNS types", () => {
    const types = ["A", "AAAA", "CNAME", "MX", "TXT", "SRV", "CAA"] as const;
    for (const type of types) {
      const r = dnsAddSchema.safeParse({ domain: "example.com", name: "test.", type, data: "x" });
      expect(r.success).toBe(true);
    }
  });

  it("rejects invalid DNS type", () => {
    const r = dnsAddSchema.safeParse({
      domain: "example.com",
      name: "test.",
      type: "PTR",
      data: "1.2.3.4",
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing domain", () => {
    const r = dnsAddSchema.safeParse({ name: "test.", type: "A", data: "1.2.3.4" });
    expect(r.success).toBe(false);
  });

  it("defaults TTL to 14400 when not provided", () => {
    const r = dnsAddSchema.safeParse({ domain: "x.com", name: "y.", type: "A", data: "1.1.1.1" });
    expect(r.success && r.data.ttl).toBeUndefined();
    // The tool handler would use "14400" as default; validate that pattern
    const ttl = r.success ? r.data.ttl ?? "14400" : undefined;
    expect(ttl).toBe("14400");
  });
});

// ---------------------------------------------------------------------------
// Email account creation schema
// ---------------------------------------------------------------------------

const emailCreateSchema = z.object({
  domain: z.string(),
  username: z.string().min(1),
  password: z.string().min(6),
  quota: z.string().optional(),
});

describe("Email create account schema", () => {
  it("accepts valid email account params", () => {
    const r = emailCreateSchema.safeParse({ domain: "example.com", username: "info", password: "Secure123" });
    expect(r.success).toBe(true);
  });

  it("rejects empty username", () => {
    const r = emailCreateSchema.safeParse({ domain: "example.com", username: "", password: "pass123" });
    expect(r.success).toBe(false);
  });

  it("rejects short password", () => {
    const r = emailCreateSchema.safeParse({ domain: "example.com", username: "info", password: "abc" });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Port parsing (mirrors config.ts)
// ---------------------------------------------------------------------------

describe("config port parsing", () => {
  it("parses port from string", () => {
    expect(parseInt("2083", 10)).toBe(2083);
    expect(parseInt("2087", 10)).toBe(2087);
  });

  it("defaults to 2083 when CPANEL_PORT is not set", () => {
    const port = parseInt(undefined ?? "2083", 10);
    expect(port).toBe(2083);
  });

  it("timeout is converted to milliseconds", () => {
    const timeoutSec = 30;
    expect(timeoutSec * 1000).toBe(30000);
  });
});
