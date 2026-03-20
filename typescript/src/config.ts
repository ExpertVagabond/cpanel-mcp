export interface CpanelConfig {
  host: string;
  username: string;
  token: string;
  port: number;
  whmPort: number;
  whmUsername: string;
  verifySsl: boolean;
  timeout: number;
}

function parsePort(envVar: string, defaultPort: number): number {
  const raw = process.env[envVar];
  if (!raw) return defaultPort;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${envVar} must be a valid port number (1-65535)`);
  }
  return parsed;
}

function parseTimeout(defaultSec: number): number {
  const raw = process.env.CPANEL_TIMEOUT;
  if (!raw) return defaultSec * 1000;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 300) {
    throw new Error("CPANEL_TIMEOUT must be between 1 and 300 seconds");
  }
  return parsed * 1000;
}

export const config: CpanelConfig = {
  host: process.env.CPANEL_HOST || "",
  username: process.env.CPANEL_USERNAME || "",
  token: process.env.CPANEL_API_TOKEN || "",
  port: parsePort("CPANEL_PORT", 2083),
  whmPort: parsePort("CPANEL_WHM_PORT", 2087),
  whmUsername: process.env.CPANEL_WHM_USERNAME || "root",
  verifySsl: process.env.CPANEL_VERIFY_SSL === "true",
  timeout: parseTimeout(30),
};

export function validateConfig(): void {
  if (!config.host) throw new Error("CPANEL_HOST environment variable is required");
  if (/[\s/\\?#@]/.test(config.host)) throw new Error("CPANEL_HOST contains invalid characters");
  if (!config.username) throw new Error("CPANEL_USERNAME environment variable is required");
  if (/[\x00-\x1f\x7f]/.test(config.username)) throw new Error("CPANEL_USERNAME must not contain control characters");
  if (!config.token) throw new Error("CPANEL_API_TOKEN environment variable is required");
  if (/[\x00-\x1f\x7f]/.test(config.token)) throw new Error("CPANEL_API_TOKEN must not contain control characters");

  // Warn about InsecureSkipVerify
  if (!config.verifySsl) {
    console.error(
      "[WARN] TLS certificate verification is DISABLED. " +
      "Set CPANEL_VERIFY_SSL=true for production environments to prevent MITM attacks.",
    );
  }
}
