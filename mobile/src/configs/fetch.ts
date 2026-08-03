import type { ZodType } from "zod";
import { useAuthStore } from "@/stores";
import { refreshAccessToken } from "@/services";

let refreshPromise: Promise<string> | null = null;

const RETRIED_HEADER = "x-takda-retried" as const;

function isAuthRequest(opts: { config?: FetchConfig }): boolean {
  return opts.config?.auth === true;
}

function attachAuthHeader(headers: Record<string, string>, token: string) {
  headers.authorization = `Bearer ${token}`;
}

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
  version?: string;
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

export interface RequestOptions<TBody, TResponse> {
  body?: TBody;
  response: ZodType<TResponse>;
  config?: FetchConfig;
}

type ReadOnlyOptions<TResponse> = {
  response: ZodType<TResponse>;
  config?: FetchConfig;
};

type WriteOptions<TBody, TResponse> = {
  body: TBody;
  response: ZodType<TResponse>;
  config?: FetchConfig;
};

export const DEFAULT_API_VERSION = process.env.API_VERSION || "v1";

async function fetchFactory<TBody, TResponse>(
  method: HttpMethod,
  path: string,
  opts:
    | WriteOptions<TBody, TResponse>
    | (RequestOptions<TBody, TResponse> & { body?: undefined }),
): Promise<TResponse> {
  try {
    return await executeRequest<TBody, TResponse>(method, path, opts);
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 401 &&
      isAuthRequest(opts) &&
      !(opts.config?.headers as Record<string, string> | undefined)?.[
        RETRIED_HEADER
      ]
    ) {
      // Try one refresh.
      const newToken = await getOrStartRefresh();
      const newHeaders: Record<string, string> = {
        ...(opts.config?.headers as Record<string, string> | undefined),
        [RETRIED_HEADER]: "1",
      };
      const retried = {
        ...opts,
        config: { ...opts.config, headers: newHeaders },
      };
      const token = useAuthStore.getState().accessToken ?? newToken;
      attachAuthHeader(newHeaders, token);
      return executeRequest<TBody, TResponse>(method, path, retried);
    }
    if (err instanceof ApiError && err.status === 401) {
      // Refresh itself failed, or second 401: sign the user out.
      await useAuthStore
        .getState()
        .signOut()
        .catch(() => undefined);
    }
    throw err;
  }
}

async function getOrStartRefresh(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const next = await refreshAccessToken();
        return next.accessToken;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function executeRequest<TBody, TResponse>(
  method: HttpMethod,
  path: string,
  opts:
    | WriteOptions<TBody, TResponse>
    | (RequestOptions<TBody, TResponse> & { body?: undefined }),
): Promise<TResponse> {
  const url = `${process.env.API_URL}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.config?.headers as Record<string, string> | undefined),
  };

  const isWrite =
    method !== "GET" &&
    method !== "DELETE" &&
    (opts as WriteOptions<TBody, TResponse>).body !== undefined;
  if (isWrite) {
    headers["Content-Type"] = "application/json";
  }
  if (opts.config?.auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) attachAuthHeader(headers, token);
  }

  const init: RequestInit = { method, headers };
  if (isWrite) {
    init.body = JSON.stringify((opts as WriteOptions<TBody, TResponse>).body);
  }

  const response = await fetch(url, init);

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errPayload =
      typeof payload === "object" && payload !== null
        ? (payload as { message?: string; details?: Record<string, string[]> })
        : { message: typeof payload === "string" ? payload : "Request failed" };
    throw new ApiError(
      errPayload.message ?? `Request failed with status ${response.status}`,
      response.status,
      errPayload.details ?? null,
    );
  }

  // Caller may opt out of validation by passing undefined as response schema.
  if (
    opts.response &&
    typeof (opts.response as { safeParse?: unknown }).safeParse === "function"
  ) {
    const parsed = (opts.response as ZodType<TResponse>).safeParse(payload);
    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "_root";
        (details[key] ??= []).push(issue.message);
      }
      throw new ApiError("Response validation failed", 500, details);
    }
    return parsed.data;
  }
  return payload as TResponse;
}

export const http = {
  get: <TResponse>(path: string, opts: ReadOnlyOptions<TResponse>) =>
    fetchFactory<undefined, TResponse>("GET", path, {
      ...opts,
      body: undefined,
    }),

  post: <TBody, TResponse>(
    path: string,
    opts: WriteOptions<TBody, TResponse>,
  ) => fetchFactory<TBody, TResponse>("POST", path, opts),

  put: <TBody, TResponse>(path: string, opts: WriteOptions<TBody, TResponse>) =>
    fetchFactory<TBody, TResponse>("PUT", path, opts),

  patch: <TBody, TResponse>(
    path: string,
    opts: WriteOptions<TBody, TResponse>,
  ) => fetchFactory<TBody, TResponse>("PATCH", path, opts),

  delete: <TResponse>(path: string, opts: ReadOnlyOptions<TResponse>) =>
    fetchFactory<undefined, TResponse>("DELETE", path, {
      ...opts,
      body: undefined,
    }),

  options: <TResponse>(path: string, opts: ReadOnlyOptions<TResponse>) =>
    fetchFactory<undefined, TResponse>("OPTIONS", path, {
      ...opts,
      body: undefined,
    }),

  query: <TResponse>(path: string, opts: ReadOnlyOptions<TResponse>) =>
    fetchFactory<undefined, TResponse>("GET", path, {
      ...opts,
      body: undefined,
    }),
};

export function createEndpoint(
  prefix: string,
  defaultOptions?: { version?: string },
) {
  const fullPath = (path: string) => {
    const cleanPrefix = prefix.startsWith("/") ? prefix : `/${prefix}`;
    return path.startsWith("/")
      ? `${cleanPrefix}${path}`
      : `${cleanPrefix}/${path}`;
  };

  const mergeConfig = (config?: FetchConfig): FetchConfig => ({
    ...(defaultOptions?.version !== undefined
      ? { version: defaultOptions.version }
      : {}),
    ...config,
  });

  return {
    get: <TResponse>(path: string, opts: ReadOnlyOptions<TResponse>) =>
      http.get<TResponse>(fullPath(path), {
        ...opts,
        config: mergeConfig(opts.config),
      }),

    post: <TBody, TResponse>(
      path: string,
      opts: WriteOptions<TBody, TResponse>,
    ) =>
      http.post<TBody, TResponse>(fullPath(path), {
        ...opts,
        config: mergeConfig(opts.config),
      }),

    put: <TBody, TResponse>(
      path: string,
      opts: WriteOptions<TBody, TResponse>,
    ) =>
      http.put<TBody, TResponse>(fullPath(path), {
        ...opts,
        config: mergeConfig(opts.config),
      }),

    patch: <TBody, TResponse>(
      path: string,
      opts: WriteOptions<TBody, TResponse>,
    ) =>
      http.patch<TBody, TResponse>(fullPath(path), {
        ...opts,
        config: mergeConfig(opts.config),
      }),

    delete: <TResponse>(path: string, opts: ReadOnlyOptions<TResponse>) =>
      http.delete<TResponse>(fullPath(path), {
        ...opts,
        config: mergeConfig(opts.config),
      }),

    options: <TResponse>(path: string, opts: ReadOnlyOptions<TResponse>) =>
      http.options<TResponse>(fullPath(path), {
        ...opts,
        config: mergeConfig(opts.config),
      }),

    query: <TResponse>(path: string, opts: ReadOnlyOptions<TResponse>) =>
      http.query<TResponse>(fullPath(path), {
        ...opts,
        config: mergeConfig(opts.config),
      }),
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
