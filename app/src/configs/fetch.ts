export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "QUERY";

export interface FetchConfig {
  headers?: HeadersInit;
  params?: Record<string, string | number | boolean>;
  auth?: boolean;
  cache?: RequestCache;
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
}

export class ApiError extends Error {
  details: Record<string, string[]> | null;
  status: number;

  constructor(
    message: string,
    status: number,
    details: Record<string, string[]> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function handleActionError(error: unknown) {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      errors: error.details || undefined,
      status: error.status,
    };
  }
  return {
    message:
      error instanceof Error
        ? error.message
        : "An unexpected error occurred. Please try again.",
    status: 500,
  };
}

interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    version: string;
  };
}

function getBaseUrl(): unknown {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return process.env.NEXT_PUBLIC_API_URL;
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    value !== null &&
    typeof value === "object" &&
    "data" in value &&
    "meta" in value &&
    typeof (value as Record<string, unknown>).meta === "object"
  );
}

async function fetchFactory<TResponse>(
  path: string,
  config: FetchConfig & { method: HttpMethod; body?: unknown } = {
    method: "GET",
  },
): Promise<TResponse> {
  const base = getBaseUrl().replace(/\/+$/u, "");

  const requestPath = path.startsWith("/")
    ? `${base}${path}`
    : `${base}/${path}`;
  const url = new URL(requestPath);

  if (config.params) {
    for (const [key, value] of Object.entries(config.params)) {
      url.searchParams.append(key, String(value));
    }
  }

  const fetchOptions = {
    method: config.method,
    headers: {
      "Content-Type": "application/json",
      ...config.headers,
    },
    body: config.body ? JSON.stringify(config.body) : undefined,
    credentials: config.auth ? "include" : undefined,
  } satisfies RequestInit;

  if (config.cache) fetchOptions.cache = config.cache;

  if (config.next) fetchOptions.next = config.next;

  let res: Response;
  try {
    res = await fetch(url.toString(), fetchOptions);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect to API";
    const hint = message.includes("ECONNREFUSED")
      ? `. Make sure the backend server is running at ${base}`
      : "";
    throw new ApiError(`Network error: ${message}${hint}`, 0, null);
  }

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    if (contentType.includes("application/json")) {
      const errorData = await res.json().catch(() => null);

      if (isApiResponse(errorData) && errorData.data) {
        const message =
          typeof errorData.data === "object" &&
          errorData.data !== null &&
          "message" in errorData.data
            ? (errorData.data as Record<string, unknown>).message
            : `Error ${res.status}`;
        const details =
          typeof errorData.data === "object" &&
          errorData.data !== null &&
          "details" in errorData.data
            ? (errorData.data as Record<string, unknown>).details
            : null;
        throw new ApiError(
          String(message) || `Error ${res.status}`,
          res.status,
          details as Record<string, string[]> | null,
        );
      }

      const rawMessage =
        errorData?.error?.message ??
        errorData?.message ??
        (Array.isArray(errorData?.message) ? errorData.message[0] : null);
      const message = rawMessage || `Error ${res.status}`;
      const details = errorData?.error?.details ?? errorData?.errors ?? null;
      throw new ApiError(message, res.status, details);
    } else {
      const text = await res.text().catch(() => null);
      throw new ApiError(text || `Error ${res.status}`, res.status, null);
    }
  }

  const json = await res.json().catch(() => null);

  if (isApiResponse<TResponse>(json)) {
    return json.data;
  }

  return json as TResponse;
}

export const http = {
  get: <TResponse>(path: string, config?: FetchConfig) =>
    fetchFactory<TResponse>(path, { ...config, method: "GET" }),

  post: <TResponse>(path: string, body?: unknown, config?: FetchConfig) =>
    fetchFactory<TResponse>(path, { ...config, method: "POST", body }),

  put: <TResponse>(path: string, body: unknown, config?: FetchConfig) =>
    fetchFactory<TResponse>(path, { ...config, method: "PUT", body }),

  patch: <TResponse>(path: string, body: unknown, config?: FetchConfig) =>
    fetchFactory<TResponse>(path, { ...config, method: "PATCH", body }),

  delete: <TResponse>(path: string, config?: FetchConfig) =>
    fetchFactory<TResponse>(path, { ...config, method: "DELETE" }),

  options: <TResponse>(path: string, config?: FetchConfig) =>
    fetchFactory<TResponse>(path, { ...config, method: "OPTIONS" }),

  query: <TResponse>(path: string, body?: unknown, config?: FetchConfig) =>
    fetchFactory<TResponse>(path, { ...config, method: "QUERY", body }),
};

export function createEndpoint(prefix: string) {
  const fullPath = (path: string) =>
    path.startsWith("/") ? `${prefix}${path}` : `${prefix}/${path}`;

  return {
    get: <TResponse>(path: string, config?: FetchConfig) =>
      http.get<TResponse>(fullPath(path), config),

    post: <TResponse>(path: string, body?: unknown, config?: FetchConfig) =>
      http.post<TResponse>(fullPath(path), body, config),

    put: <TResponse>(path: string, body: unknown, config?: FetchConfig) =>
      http.put<TResponse>(fullPath(path), body, config),

    patch: <TResponse>(path: string, body: unknown, config?: FetchConfig) =>
      http.patch<TResponse>(fullPath(path), body, config),

    delete: <TResponse>(path: string, config?: FetchConfig) =>
      http.delete<TResponse>(fullPath(path), config),

    options: <TResponse>(path: string, config?: FetchConfig) =>
      http.options<TResponse>(fullPath(path), config),

    query: <TResponse>(path: string, body?: unknown, config?: FetchConfig) =>
      http.query<TResponse>(fullPath(path), body, config),
  };
}

export const cacheStrategies = {
  static: { cache: "force-cache" as RequestCache },

  dynamic: { cache: "no-store" as RequestCache },

  revalidate: (seconds: number) => ({
    next: { revalidate: seconds },
  }),

  tagged: (tags: string[]) => ({
    next: { tags },
  }),

  revalidateTagged: (seconds: number, tags: string[]) => ({
    next: { revalidate: seconds, tags },
  }),
};
