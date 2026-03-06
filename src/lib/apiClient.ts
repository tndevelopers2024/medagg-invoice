const AUTH_TOKEN_KEY = "authToken";

export const getAuthToken = () => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const setAuthToken = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
};

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export const apiFetch = async <T = unknown>(path: string, init: RequestInit = {}): Promise<T> => {
  const baseUrl = getApiBaseUrl();

  const token = getAuthToken();

  const headers = new Headers(init.headers || {});

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  if (!headers.has("content-type") && init.body && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  const body = (headers.get("content-type") === "application/json" && init.body && typeof init.body !== "string")
    ? JSON.stringify(init.body)
    : init.body;

  const res = await fetch(`${baseUrl}${path}`, { ...init, body, headers });

  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const responseBody = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

  if (!res.ok) {
    const message = (responseBody && typeof responseBody === "object" && "error" in responseBody)
      ? String((responseBody as { error?: unknown }).error)
      : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, responseBody);
  }

  return responseBody as T;
};
