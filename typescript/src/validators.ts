/**
 * Centralized input validators for cpanel-mcp security hardening.
 *
 * Every user-facing string parameter is validated against format constraints
 * to prevent injection attacks, path traversal, and malformed input from
 * reaching the cPanel/WHM API layer.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Domain & hostname validation
// ---------------------------------------------------------------------------

/** RFC-compliant domain label: alphanumeric + hyphens, 1-63 chars, no leading/trailing hyphen */
const DOMAIN_LABEL = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

/** Validates a fully-qualified domain name (e.g. example.com, sub.example.co.uk) */
export const domainSchema = z
  .string()
  .min(1, "Domain is required")
  .max(253, "Domain name exceeds maximum length of 253 characters")
  .refine((val) => {
    const labels = val.replace(/\.$/, "").split(".");
    if (labels.length < 2) return false;
    return labels.every((label) => DOMAIN_LABEL.test(label));
  }, "Invalid domain name format — expected something like example.com");

/** Validates a subdomain label (the part before the root domain, e.g. 'blog') */
export const subdomainLabelSchema = z
  .string()
  .min(1, "Subdomain label is required")
  .max(63, "Subdomain label exceeds maximum length of 63 characters")
  .regex(DOMAIN_LABEL, "Invalid subdomain label — must be alphanumeric (hyphens allowed, not at start/end)");

// ---------------------------------------------------------------------------
// Email validation
// ---------------------------------------------------------------------------

/** Validates an email address: local@domain format with basic structural checks */
export const emailSchema = z
  .string()
  .min(3, "Email address is too short")
  .max(254, "Email address exceeds maximum length of 254 characters")
  .refine((val) => {
    const parts = val.split("@");
    if (parts.length !== 2) return false;
    const [local, domain] = parts;
    // Local part: non-empty, no control chars
    if (!local || local.length > 64) return false;
    if (/[\x00-\x1f\x7f]/.test(local)) return false;
    // Domain part: valid domain
    const labels = domain.split(".");
    if (labels.length < 2) return false;
    return labels.every((label) => DOMAIN_LABEL.test(label));
  }, "Invalid email address format — expected user@domain.com");

// ---------------------------------------------------------------------------
// File path validation (path traversal prevention)
// ---------------------------------------------------------------------------

/**
 * Validates a file path for use with cPanel file operations.
 * Blocks path traversal sequences, null bytes, and other dangerous patterns.
 */
export const safePathSchema = z
  .string()
  .min(1, "Path is required")
  .max(4096, "Path exceeds maximum length")
  .refine((val) => !val.includes("\0"), "Path must not contain null bytes")
  .refine(
    (val) => {
      // Normalize and check for traversal — block ../  ..\ and encoded variants
      const normalized = decodeURIComponent(val);
      return !/(^|\/)\.\.($|\/)/.test(normalized) && !/(^|\\)\.\.($|\\)/.test(normalized);
    },
    "Path traversal detected — '..' sequences are not allowed",
  )
  .refine((val) => !/[<>|;`$]/.test(val), "Path contains forbidden characters");

/** Validates a filename (no directory separators allowed) */
export const safeFilenameSchema = z
  .string()
  .min(1, "Filename is required")
  .max(255, "Filename exceeds maximum length of 255 characters")
  .refine((val) => !val.includes("/") && !val.includes("\\"), "Filename must not contain directory separators")
  .refine((val) => !val.includes("\0"), "Filename must not contain null bytes")
  .refine((val) => val !== "." && val !== "..", "Filename must not be '.' or '..'");

// ---------------------------------------------------------------------------
// Username validation
// ---------------------------------------------------------------------------

/** cPanel usernames: alphanumeric + underscore, 1-16 chars */
export const cpanelUsernameSchema = z
  .string()
  .min(1, "Username is required")
  .max(16, "cPanel username exceeds maximum length of 16 characters")
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_]*$/,
    "Username must start with a letter and contain only alphanumeric characters and underscores",
  );

/** MySQL/FTP usernames: alphanumeric + underscore + dot + hyphen */
export const serviceUsernameSchema = z
  .string()
  .min(1, "Username is required")
  .max(32, "Username exceeds maximum length of 32 characters")
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/,
    "Username must start with alphanumeric and contain only alphanumeric, underscores, dots, and hyphens",
  );

// ---------------------------------------------------------------------------
// Database & privilege validation
// ---------------------------------------------------------------------------

/** MySQL database name: alphanumeric + underscore */
export const databaseNameSchema = z
  .string()
  .min(1, "Database name is required")
  .max(64, "Database name exceeds maximum length of 64 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Database name must contain only alphanumeric characters and underscores",
  );

/** Validates MySQL privilege strings against a known allowlist */
const VALID_PRIVILEGES = new Set([
  "ALL PRIVILEGES",
  "ALL",
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "CREATE",
  "DROP",
  "ALTER",
  "INDEX",
  "CREATE TEMPORARY TABLES",
  "LOCK TABLES",
  "REFERENCES",
  "CREATE VIEW",
  "SHOW VIEW",
  "CREATE ROUTINE",
  "ALTER ROUTINE",
  "EXECUTE",
  "EVENT",
  "TRIGGER",
]);

export const privilegesSchema = z
  .string()
  .min(1, "Privileges are required")
  .refine(
    (val) => {
      const privs = val.split(",").map((p) => p.trim().toUpperCase());
      return privs.every((p) => VALID_PRIVILEGES.has(p));
    },
    "Invalid privilege — allowed values: ALL PRIVILEGES, SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, CREATE TEMPORARY TABLES, LOCK TABLES, REFERENCES, CREATE VIEW, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, EXECUTE, EVENT, TRIGGER",
  );

// ---------------------------------------------------------------------------
// Cron schedule validation
// ---------------------------------------------------------------------------

/** Validates a cron schedule field (minute, hour, day, month, weekday) */
export const cronFieldSchema = (fieldName: string, min: number, max: number) =>
  z
    .string()
    .min(1, `${fieldName} is required`)
    .refine(
      (val) => {
        // Allow: *, */N, N, N-M, N,M,O, N-M/S and combinations
        return /^(\*|\d+(-\d+)?(\/\d+)?)(,(\*|\d+(-\d+)?(\/\d+)?))*$/.test(val) || val === "*";
      },
      `Invalid cron ${fieldName} — use numbers (${min}-${max}), *, */N, N-M, or comma-separated values`,
    )
    .refine(
      (val) => {
        // Validate numeric ranges
        const nums = val.match(/\d+/g);
        if (!nums) return true; // Pure "*" is fine
        return nums.every((n) => {
          const num = parseInt(n, 10);
          // Allow step values greater than max (e.g., */60 is valid cron syntax that cPanel handles)
          return !isNaN(num) && num >= 0 && num <= 999;
        });
      },
      `Cron ${fieldName} contains out-of-range numbers`,
    );

/**
 * Validates a cron command.
 * Blocks known dangerous patterns while allowing legitimate shell commands.
 */
export const cronCommandSchema = z
  .string()
  .min(1, "Command is required")
  .max(1024, "Command exceeds maximum length of 1024 characters")
  .refine((val) => !val.includes("\0"), "Command must not contain null bytes")
  .refine(
    (val) => {
      // Block obvious shell injection patterns that shouldn't appear in cron commands
      const dangerous = [
        /\$\(.*\)/, // Command substitution $(...)
        /`[^`]+`/, // Backtick command substitution
        /\|\s*(bash|sh|zsh|dash|ksh|csh)\b/, // Piping to shells
        /;\s*(rm|chmod|chown|dd|mkfs|fdisk)\s+-rf?\s+\//, // Destructive commands on root
        />\s*\/etc\//, // Writing to /etc
        />\s*\/dev\//, // Writing to devices
        /\beval\b/, // eval
        /\bexec\b.*</, // exec with redirection
      ];
      return !dangerous.some((pattern) => pattern.test(val));
    },
    "Command contains potentially dangerous patterns — review the command and ensure it is safe",
  );

// ---------------------------------------------------------------------------
// Numeric string validation
// ---------------------------------------------------------------------------

/** Validates a string that should represent a non-negative integer */
export const numericStringSchema = (fieldName: string) =>
  z
    .string()
    .regex(/^\d+$/, `${fieldName} must be a non-negative integer`)
    .refine((val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 0;
    }, `${fieldName} must be a valid non-negative integer`);

/** Validates a DNS TTL value (300-86400 seconds, or common values) */
export const ttlSchema = z
  .string()
  .regex(/^\d+$/, "TTL must be a numeric value in seconds")
  .refine(
    (val) => {
      const num = parseInt(val, 10);
      return num >= 60 && num <= 604800;
    },
    "TTL must be between 60 and 604800 seconds (1 minute to 7 days)",
  );

// ---------------------------------------------------------------------------
// DNS record validation
// ---------------------------------------------------------------------------

/** DNS record name: valid hostname or FQDN with optional trailing dot */
export const dnsRecordNameSchema = z
  .string()
  .min(1, "Record name is required")
  .max(253, "Record name exceeds maximum length")
  .refine(
    (val) => {
      const name = val.replace(/\.$/, "");
      const labels = name.split(".");
      return labels.every(
        (label) => label === "*" || label === "@" || DOMAIN_LABEL.test(label),
      );
    },
    "Invalid DNS record name format",
  );

// ---------------------------------------------------------------------------
// Country code validation (for SSL CSR)
// ---------------------------------------------------------------------------

export const countryCodeSchema = z
  .string()
  .length(2, "Country code must be exactly 2 characters")
  .regex(/^[A-Z]{2}$/, "Country code must be two uppercase letters (e.g., US, GB, DE)");

// ---------------------------------------------------------------------------
// PHP version validation
// ---------------------------------------------------------------------------

export const phpVersionSchema = z
  .string()
  .regex(
    /^ea-php\d{2,3}$/,
    "PHP version must match format ea-phpNN (e.g., ea-php81, ea-php82, ea-php83)",
  );

// ---------------------------------------------------------------------------
// Package name validation
// ---------------------------------------------------------------------------

export const packageNameSchema = z
  .string()
  .min(1, "Package name is required")
  .max(64, "Package name exceeds maximum length of 64 characters")
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_. -]*$/,
    "Package name must start with alphanumeric and contain only alphanumeric, underscores, dots, spaces, and hyphens",
  );

// ---------------------------------------------------------------------------
// DNS line number validation
// ---------------------------------------------------------------------------

export const dnsLineSchema = z
  .string()
  .regex(/^\d+$/, "DNS line number must be a non-negative integer");

// ---------------------------------------------------------------------------
// Password validation (minimum security requirements)
// ---------------------------------------------------------------------------

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password exceeds maximum length of 128 characters")
  .refine((val) => !val.includes("\0"), "Password must not contain null bytes");

// ---------------------------------------------------------------------------
// Quota validation
// ---------------------------------------------------------------------------

export const quotaSchema = z
  .string()
  .regex(/^\d+$/, "Quota must be a non-negative integer (MB, 0 for unlimited)");

// ---------------------------------------------------------------------------
// Safe error wrapping
// ---------------------------------------------------------------------------

/**
 * Wraps an error message to prevent internal information leakage.
 * Strips file paths, stack traces, and credential-like patterns.
 */
export function sanitizeToolError(e: unknown): string {
  if (e instanceof z.ZodError) {
    // Return Zod validation errors as-is (they are user-facing and safe)
    return e.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("; ");
  }
  let raw = e instanceof Error ? e.message : String(e);

  // Redact any credential env var values that may be reflected in error messages
  for (const envKey of ["CPANEL_API_TOKEN", "CPANEL_WHM_PASSWORD"]) {
    const val = process.env[envKey];
    if (val && val.length > 3) {
      raw = raw.replaceAll(val, "[REDACTED]");
    }
  }

  return raw
    // Strip absolute file paths
    .replace(/\/[^\s:]+\.(ts|js|json|mjs|cjs)/g, "[path]")
    // Strip stack trace lines
    .replace(/\n\s+at\s+.*/g, "")
    // Redact long alphanumeric sequences that look like tokens (32+ chars)
    .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted-token]")
    // Truncate overly long messages
    .slice(0, 500);
}
