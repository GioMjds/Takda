import type { ZodType } from "zod";
import { useAuthStore } from "@/stores/auth";

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

function getBaseUrl(version: string = DEFAULT_API_VERSION): string {
  const base = process.env.API_URL;
  if (!base) {
    throw new ApiError("API_URL is not set", 0, null);
  }
  const trimmedBase = base.replace(/\/+$/u, "");

  if (/\/v\d+$/i.test(trimmedBase)) {
    return trimmedBase;
  }

  const formattedVersion = version
    ? version.replace(/^\/+/u, "").replace(/\/+$/u, "")
    : "";
  return formattedVersion ? `${trimmedBase}/${formattedVersion}` : trimmedBase;
}

async function fetchFactory<TBody, TResponse>(
  method: HttpMethod,
  path: string,
  opts:
    | WriteOptions<TBody, TResponse>
    | (RequestOptions<TBody, TResponse> & { body?: undefined }),
): Promise<TResponse> {
  const version = opts.config?.version ?? DEFAULT_API_VERSION;
  const base = getBaseUrl(version);

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const requestPath =
    path.startsWith("http://") || path.startsWith("https://")
      ? path
      : `${base}${cleanPath}`;
  const url = new URL(requestPath);

  if (opts.config?.params) {
    for (const [key, value] of Object.entries(opts.config.params)) {
      url.searchParams.append(key, String(value));
    }
  }

  const token = useAuthStore.getState().token;
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.config?.auth && token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.config?.headers as Record<string, string> | undefined),
  };

  const fetchOptions: RequestInit & { next?: FetchConfig["next"] } = {
    method,
    headers: baseHeaders,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: opts.config?.auth ? "include" : undefined,
  };

  if (opts.config?.cache) fetchOptions.cache = opts.config.cache;
  if (opts.config?.next) fetchOptions.next = opts.config.next;

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

      const rawMessage =
        errorData?.message ??
        (Array.isArray(errorData?.message) ? errorData.message[0] : null);
      const message =
        typeof errorData?.message === "string"
          ? errorData.message
          : rawMessage || `Error ${res.status}`;
      const details = errorData?.error?.details ?? errorData?.errors ?? null;
      throw new ApiError(message, res.status, details);
    } else {
      const text = await res.text().catch(() => null);
      throw new ApiError(text || `Error ${res.status}`, res.status, null);
    }
  }

  if (res.status === 204) {
    const parsed = opts.response.safeParse(undefined);
    if (!parsed.success) {
      throw new ApiError(
        "Response validation failed",
        422,
        formatIssues(parsed.error.issues),
      );
    }
    return parsed.data as TResponse;
  }

  const json = await res.json().catch(() => null);
  const parsed = opts.response.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(
      "Response validation failed",
      422,
      formatIssues(parsed.error.issues),
    );
  }
  return parsed.data as TResponse;
}

type FormatIssues = {
  path: PropertyKey[];
  message: string;
};

function formatIssues(issues: FormatIssues[]): Record<string, string[]> {
  const issueMap: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map((p) => String(p)).join(".") || "_";
    (issueMap[key] ??= []).push(issue.message);
  }
  return issueMap;
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
