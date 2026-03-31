import { config } from "../config.js";
import https from "node:https";
import { sanitizeError } from "@psm/mcp-core-ts";

// Create a custom HTTPS agent for cPanel requests when SSL verification is disabled
// This scopes the TLS bypass to only cPanel API calls instead of the entire process
export const cpanelAgent = !config.verifySsl
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;

/**
 * Redacts sensitive tokens/credentials from a string, preserving only the
 * first 4 characters for debugging. Returns "[empty]" for blank values.
 */
function redact(value: string): string {
  if (!value) return "[empty]";
  if (value.length <= 4) return "****";
  return value.slice(0, 4) + "****";
}

/**
 * Strips any credential-like patterns from error body text so they are
 * never surfaced in logs, error messages, or stack traces.
 */
function sanitizeErrorBody(body: string, maxLength = 500): string {
  // Truncate excessively long bodies to prevent memory issues
  const truncated = body.length > maxLength ? body.slice(0, maxLength) + "...[truncated]" : body;
  // Remove anything that looks like a token or Authorization header value
  return truncated
    .replace(/(?:cpanel|whm)\s+\S+:\S+/gi, "[redacted-auth]")
    .replace(/[A-Za-z0-9]{32,}/g, "[redacted-token]");
}

/**
 * Validates that a hostname is a plausible cPanel server address.
 * Rejects IP ranges commonly used for SSRF (localhost, link-local, metadata endpoints),
 * embedded credentials, path traversal, and non-hostname characters.
 */
function validateHost(host: string): void {
  if (!host) {
    throw new Error("CPANEL_HOST is required");
  }

  // Reject embedded credentials (user:pass@host)
  if (host.includes("@")) {
    throw new Error("CPANEL_HOST must not contain credentials (@ symbol detected)");
  }

  // Reject path components or query strings injected into hostname
  if (/[/\\?#]/.test(host)) {
    throw new Error("CPANEL_HOST must be a hostname only — no paths, queries, or fragments");
  }

  // Reject whitespace and control characters
  if (/\s/.test(host)) {
    throw new Error("CPANEL_HOST must not contain whitespace");
  }

  const lower = host.toLowerCase();

  // Block localhost and loopback
  if (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "[::1]" ||
    lower === "0.0.0.0" ||
    lower.startsWith("127.")
  ) {
    throw new Error("CPANEL_HOST must not point to localhost or loopback addresses");
  }

  // Block cloud metadata endpoints (AWS, GCP, Azure)
  if (lower === "169.254.169.254" || lower.endsWith(".internal") || lower === "metadata.google.internal") {
    throw new Error("CPANEL_HOST must not point to cloud metadata endpoints");
  }

  // Block private/link-local ranges when given as IPs
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(lower)) {
    throw new Error("CPANEL_HOST must not point to private or link-local IP ranges");
  }

  // Block IPv6-mapped IPv4 addresses (::ffff:x.x.x.x) that bypass IPv4 checks above
  // Also block bare IPv6 localhost (::1) without brackets
  const stripped = lower.replace(/^\[|\]$/g, ""); // strip optional brackets
  if (stripped === "::1") {
    throw new Error("CPANEL_HOST must not point to localhost or loopback addresses");
  }
  if (/^::ffff:/.test(stripped)) {
    const mapped = stripped.replace(/^::ffff:/, "");
    // Re-check the mapped IPv4 address against all private/loopback/metadata ranges
    if (
      mapped === "127.0.0.1" ||
      mapped.startsWith("127.") ||
      mapped === "0.0.0.0" ||
      mapped === "169.254.169.254" ||
      /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(mapped)
    ) {
      throw new Error("CPANEL_HOST must not point to private or loopback addresses (IPv6-mapped)");
    }
  }
}

/**
 * Validates that a cPanel API token looks structurally correct.
 * cPanel tokens are alphanumeric strings, typically 20+ characters.
 */
function validateToken(token: string): void {
  if (!token) {
    throw new Error("CPANEL_API_TOKEN is required");
  }
  if (token.length < 10) {
    throw new Error("CPANEL_API_TOKEN is too short — expected at least 10 characters");
  }
  // cPanel tokens are alphanumeric (sometimes with underscores/hyphens)
  if (!/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new Error("CPANEL_API_TOKEN contains invalid characters — expected alphanumeric, hyphens, or underscores");
  }
}

/**
 * Validates that a username looks structurally correct.
 * cPanel usernames are typically short alphanumeric + underscore strings.
 */
function validateUsername(username: string): void {
  if (!username) {
    throw new Error("Username is required");
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(username)) {
    throw new Error("Username contains invalid characters — expected alphanumeric, dots, hyphens, or underscores");
  }
}

export class CpanelApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(`cPanel API ${status}: ${message}`);
    this.name = "CpanelApiError";
    // Prevent credentials from leaking through stack traces — capture a clean stack
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CpanelApiError);
    }
  }
}

export async function request<T>(
  apiType: "uapi" | "whm",
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  // Validate credentials and host before making any network request
  validateHost(config.host);
  validateToken(config.token);
  const authUser = apiType === "uapi" ? config.username : config.whmUsername;
  if (apiType === "whm" && !authUser) {
    throw new Error(
      "CPANEL_WHM_USERNAME environment variable is required for WHM operations. " +
      "No default is provided — set it explicitly (e.g. CPANEL_WHM_USERNAME=root).",
    );
  }
  validateUsername(authUser);

  const port = apiType === "uapi" ? config.port : config.whmPort;
  const authPrefix = apiType === "uapi" ? "cpanel" : "whm";

  const url = new URL(`https://${config.host}:${port}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") {
        url.searchParams.set(k, v);
      }
    }
  }

  // Double-check the constructed URL still points to the intended host
  // (prevents host-override via crafted path values)
  if (url.hostname !== config.host) {
    throw new Error("URL hostname mismatch — possible injection in path or params");
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
      // Sanitize the error body to strip any reflected credentials
      const safeBody = sanitizeErrorBody(body || res.statusText);
      throw new CpanelApiError(res.status, safeBody);
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    // Re-throw CpanelApiError as-is (already sanitized)
    if (err instanceof CpanelApiError) {
      throw err;
    }
    // For network/fetch errors, strip any credential info from the message
    const message =
      err instanceof Error ? err.message : "Unknown error";
    // Never include the raw error (which may contain URL with auth params)
    const safeMessage = message
      .replace(config.token, redact(config.token))
      .replace(config.host, "[host]");
    // Apply core sanitizeError as additional safety layer — strips file paths, redacts long tokens
    throw new CpanelApiError(0, `Network error: ${sanitizeError(safeMessage, 500)}`);
  } finally {
    clearTimeout(timer);
  }
}
