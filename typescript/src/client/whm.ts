import { request, CpanelApiError } from "./base.js";

export interface WhmResponse<T = unknown> {
  metadata: {
    version: number;
    result: number;
    reason: string;
    command: string;
  };
  data: T;
}

export async function whm<T = unknown>(
  func: string,
  params?: Record<string, string>,
): Promise<T> {
  const allParams = { "api.version": "1", ...params };
  const raw = await request<WhmResponse<T>>(
    "whm",
    `/json-api/${func}`,
    allParams,
  );

  if (raw.metadata.result !== 1) {
    throw new CpanelApiError(0, raw.metadata.reason || "Unknown WHM error", raw);
  }

  return raw.data;
}
