import type { SSEClientOptions, SSEConnectionStatus } from "@/types";

export class SSEClient {
  private url: string;
  private headers: Record<string, string>;
  private initialReconnectDelay: number;
  private maxReconnectDelay: number;
  private maxReconnectAttempts: number;

  private xhr: XMLHttpRequest | null = null;
  private status: SSEConnectionStatus = "idle";
  private reconnectAttempt: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isManuallyClosed: boolean = false;
  private processedIndex: number = 0;

  private onOpen?: () => void;
  private onMessage?: (event: {
    id?: string;
    event?: string;
    data: string;
  }) => void;
  private onError?: (error: Error | Event) => void;
  private onStatusChange?: (status: SSEConnectionStatus) => void;

  constructor(options: SSEClientOptions) {
    this.url = options.url;
    this.headers = options.headers || {};
    this.initialReconnectDelay = options.initialReconnectDelay ?? 1000;
    this.maxReconnectDelay = options.maxReconnectDelay ?? 30000;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? Infinity;

    this.onOpen = options.onOpen;
    this.onMessage = options.onMessage;
    this.onError = options.onError;
    this.onStatusChange = options.onStatusChange;
  }

  public connect(): void {
    this.isManuallyClosed = false;
    this.clearReconnectTimer();

    if (this.xhr) {
      this.disconnect(false);
    }

    this.setStatus(this.reconnectAttempt > 0 ? "reconnecting" : "connecting");

    try {
      const xhr = new XMLHttpRequest();
      this.xhr = xhr;
      this.processedIndex = 0;

      xhr.open("GET", this.url, true);
      xhr.setRequestHeader("Accept", "text/event-stream");
      xhr.setRequestHeader("Cache-Control", "no-cache");

      for (const [key, value] of Object.entries(this.headers)) {
        if (value) {
          xhr.setRequestHeader(key, value);
        }
      }

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 3 || xhr.readyState === 4) {
          if (this.status === "connecting" || this.status === "reconnecting") {
            if (xhr.status >= 200 && xhr.status < 300) {
              this.setStatus("connected");
              this.reconnectAttempt = 0;
              this.onOpen?.();
            }
          }
        }
      };

      xhr.onprogress = () => {
        this.parseStreamData();
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          this.parseStreamData();
        } else {
          this.handleFailure(
            new Error(`SSE HTTP request failed with status ${xhr.status}`),
          );
        }
      };

      xhr.onerror = (e) => {
        this.handleFailure(new Error("Network error during SSE connection"));
      };

      xhr.ontimeout = () => {
        this.handleFailure(new Error("SSE connection request timed out"));
      };

      xhr.send();
    } catch (err) {
      this.handleFailure(
        err instanceof Error ? err : new Error("Failed to start SSE request"),
      );
    }
  }

  public disconnect(manual = true): void {
    if (manual) {
      this.isManuallyClosed = true;
      this.clearReconnectTimer();
      this.reconnectAttempt = 0;
    }

    if (this.xhr) {
      try {
        this.xhr.abort();
      } catch {
        // Ignore abort errors
      }
      this.xhr = null;
    }

    this.setStatus(manual ? "disconnected" : "idle");
  }

  public getStatus(): SSEConnectionStatus {
    return this.status;
  }

  public updateHeaders(newHeaders: Record<string, string>): void {
    this.headers = { ...newHeaders };
  }

  private setStatus(newStatus: SSEConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.onStatusChange?.(newStatus);
    }
  }

  private parseStreamData(): void {
    if (!this.xhr) return;
    const responseText = this.xhr.responseText || "";
    if (responseText.length <= this.processedIndex) return;

    const newChunk = responseText.slice(this.processedIndex);
    const blocks = newChunk.split("\n\n");

    // Hold the last incomplete block for the next onprogress call
    if (!newChunk.endsWith("\n\n")) {
      const incomplete = blocks.pop() || "";
      this.processedIndex = responseText.length - incomplete.length;
    } else {
      this.processedIndex = responseText.length;
    }

    for (const block of blocks) {
      if (!block.trim()) continue;
      this.parseBlock(block);
    }
  }

  private parseBlock(block: string): void {
    const lines = block.split(/\r?\n/);
    let eventName: string | undefined;
    let dataLines: string[] = [];
    let eventId: string | undefined;

    for (const line of lines) {
      if (line.startsWith(":")) {
        // Heartbeat comment line
        continue;
      }
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      } else if (line.startsWith("id:")) {
        eventId = line.slice(3).trim();
      } else if (line.startsWith("retry:")) {
        const retryMs = parseInt(line.slice(6).trim(), 10);
        if (!isNaN(retryMs) && retryMs > 0) {
          this.initialReconnectDelay = retryMs;
        }
      }
    }

    if (dataLines.length > 0) {
      const data = dataLines.join("\n");
      this.onMessage?.({
        id: eventId,
        event: eventName,
        data,
      });
    }
  }

  private handleFailure(error: Error): void {
    this.onError?.(error);
    this.setStatus("error");

    if (this.xhr) {
      try {
        this.xhr.abort();
      } catch {
        // Ignore abort errors
      }
      this.xhr = null;
    }

    if (!this.isManuallyClosed) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      this.setStatus("disconnected");
      return;
    }

    this.clearReconnectTimer();
    this.reconnectAttempt++;

    const delay = Math.min(
      this.initialReconnectDelay * Math.pow(2, this.reconnectAttempt - 1) +
        Math.floor(Math.random() * 1000),
      this.maxReconnectDelay,
    );

    this.setStatus("reconnecting");
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
