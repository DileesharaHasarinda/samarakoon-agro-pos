import { API_BASE_URL } from "../config/app";

import type { ValidationErrors } from "../types/auth";

interface ApiErrorPayload {
  message?: string;
  errors?: ValidationErrors;
}

interface ApiRequestOptions extends Omit<RequestInit, "headers"> {
  token?: string | null;
  headers?: HeadersInit;
}

export class ApiError extends Error {
  public readonly status: number;

  public readonly errors?: ValidationErrors;

  public constructor(
    message: string,
    status: number,
    errors?: ValidationErrors
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { token, headers: providedHeaders, ...requestOptions } = options;

  const headers = new Headers(providedHeaders);

  headers.set("Accept", "application/json");

  if (requestOptions.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const normalisedPath = path.startsWith("/") ? path : `/${path}`;

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${normalisedPath}`, {
      ...requestOptions,
      headers,
    });
  } catch {
    throw new ApiError(
      "Unable to connect to the Samarakoon POS API. Make sure the Laravel server is running.",
      0
    );
  }

  const contentType = response.headers.get("content-type");

  let payload: ApiErrorPayload | T | null = null;

  if (contentType?.includes("application/json")) {
    payload = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null;

    throw new ApiError(
      errorPayload?.message ?? `Request failed with status ${response.status}.`,
      response.status,
      errorPayload?.errors
    );
  }

  return payload as T;
}
