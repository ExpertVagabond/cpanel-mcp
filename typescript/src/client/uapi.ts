import { request, CpanelApiError } from "./base.js";

export interface UapiResponse<T = unknown> {
  apiversion: number;
  func: string;
  module: string;
  result: {
    data: T;
    errors: string[] | null;
    messages: string[] | null;
    metadata: Record<string, unknown>;
    status: number;
    warnings: string[] | null;
  };
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

  if (raw.result.status !== 1) {
    const errors = raw.result.errors?.join("; ") || "Unknown UAPI error";
    throw new CpanelApiError(0, errors, raw);
  }

  return raw.result.data;
}
