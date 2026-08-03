export type SSEConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  timestamp: string;
  read?: boolean;
  data?: Record<string, unknown>;
}

export interface NotificationItem extends NotificationPayload {
  read: boolean;
  receivedAt: Date;
}

export type MessageEvent = {
  id?: string;
  event?: string;
  data: string;
};

export interface SSEClientOptions {
  url: string;
  headers: Record<string, string>;
  withCredentials?: boolean;
  initialReconnectDelay?: number;
  maxReconnectDelay?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Error | Event) => void;
  onStatusChange?: (status: SSEConnectionStatus) => void;
}
