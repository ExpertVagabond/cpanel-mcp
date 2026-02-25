import { request, CpanelApiError } from "./base.js";

export interface UapiResult<T = unknown> {
  data: T;
  errors: string[] | null;
  messages: string[] | null;
  metadata: Record<string, unknown>;
  status: number;
  warnings: string[] | null;
}

// cPanel returns {result: {...}} in some versions, flat {...} in others
export interface UapiResponse<T = unknown> {
  apiversion?: number;
  func?: string;
  module?: string;
  result?: UapiResult<T>;
  // Flat format fields (some cPanel versions)
  data?: T;
  errors?: string[] | null;
  messages?: string[] | null;
  metadata?: Record<string, unknown>;
  status?: number;
  warnings?: string[] | null;
}

export async function uapi<T = unknown>(
  module: string,
  func: string,
  params?: Record<string, string>,
): Promise<T> {
  const raw = await request<UapiResponse<T>>(
    "uapi",
    `/execute/${module}/${func}`,
    params,
  );

  // Handle both wrapped {result: {...}} and flat {status, data, ...} formats
  const result: UapiResult<T> = raw.result ?? (raw as unknown as UapiResult<T>);

  if (result.status !== 1) {
    const errors = result.errors?.join("; ") || "Unknown UAPI error";
    throw new CpanelApiError(0, errors, raw);
  }

  return result.data;
}
