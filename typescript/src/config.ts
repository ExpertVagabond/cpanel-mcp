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

export const config: CpanelConfig = {
  host: process.env.CPANEL_HOST || "",
  username: process.env.CPANEL_USERNAME || "",
  token: process.env.CPANEL_API_TOKEN || "",
  port: parseInt(process.env.CPANEL_PORT || "2083", 10),
  whmPort: parseInt(process.env.CPANEL_WHM_PORT || "2087", 10),
  whmUsername: process.env.CPANEL_WHM_USERNAME || "root",
  verifySsl: process.env.CPANEL_VERIFY_SSL === "true",
  timeout: parseInt(process.env.CPANEL_TIMEOUT || "30", 10) * 1000,
};

export function validateConfig(): void {
  if (!config.host) throw new Error("CPANEL_HOST environment variable is required");
  if (!config.username) throw new Error("CPANEL_USERNAME environment variable is required");
  if (!config.token) throw new Error("CPANEL_API_TOKEN environment variable is required");
}
