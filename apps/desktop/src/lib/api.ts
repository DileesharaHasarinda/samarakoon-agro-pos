interface ApiErrorPayload {
  message?: string;
  errors?: Record<string, string[]>;
}

const TOKEN_STORAGE_KEY = "samarakoon_pos_access_token";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;

  readonly errors: Record<string, string[]> | undefined;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export const authTokenStorage = {
  get(): string | null {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  },

  set(token: string): void {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  },

  clear(): void {
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  },
};

function buildUrl(path: string): string {
  const normalisedPath = path.startsWith("/") ? path : `/${path}`;

  return `${API_BASE_URL}${normalisedPath}`;
}

function findErrorMessage(
  payload: ApiErrorPayload | null,
  fallback: string
): string {
  if (payload?.errors) {
    const firstError = Object.values(payload.errors).flat().find(Boolean);

    if (firstError) {
      return firstError;
    }
  }

  return payload?.message || fallback;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = authTokenStorage.get();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError("Cannot connect to the Samarakoon POS server.", 0);
  }

  const responseText = await response.text();

  let payload: unknown = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }

  if (!response.ok) {
    const errorPayload =
      typeof payload === "object" && payload !== null
        ? (payload as ApiErrorPayload)
        : null;

    throw new ApiError(
      findErrorMessage(
        errorPayload,
        `Request failed with status ${response.status}.`
      ),
      response.status,
      errorPayload?.errors
    );
  }

  return payload as T;
}
