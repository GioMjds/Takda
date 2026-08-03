import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuthStore } from "@/stores/auth";
import { SSEClient } from "@/lib/sse-client";
import {
  initLocalNotifications,
  presentLocalNotification,
} from "@/services/notifications-local";
import {
  MessageEvent,
  NotificationItem,
  NotificationPayload,
  SSEConnectionStatus,
} from "@/types/notifications";

export interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  status: SSEConnectionStatus;
  lastNotification: NotificationItem | null;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  reconnect: () => void;
  subscribeToEvent: <T = unknown>(
    eventType: string,
    callback: (data: T) => void,
  ) => () => void;
}

export const NotificationContext = createContext<
  NotificationContextValue | undefined
>(undefined);

interface NotificationProviderProps {
  children: React.ReactNode;
  endpoint?: string;
  enableLocalPush?: boolean;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  endpoint = "/notifications/sse",
  enableLocalPush = true,
}) => {
  const token = useAuthStore((state) => state.token);
  const authStatus = useAuthStore((state) => state.status);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [status, setStatusState] = useState<SSEConnectionStatus>("idle");
  const statusRef = useRef<SSEConnectionStatus>("idle");

  const setStatus = useCallback((newStatus: SSEConnectionStatus) => {
    if (statusRef.current !== newStatus) {
      statusRef.current = newStatus;
      setStatusState(newStatus);
    }
  }, []);
  const [lastNotification, setLastNotification] =
    useState<NotificationItem | null>(null);

  const sseClientRef = useRef<SSEClient | null>(null);
  const listenersRef = useRef<
    Map<string, Set<(data: NotificationItem | Record<string, unknown>) => void>>
  >(new Map());
  const handleIncomingMessageRef = useRef<(event: MessageEvent) => void>(
    () => {},
  );

  useEffect(() => {
    if (enableLocalPush) {
      initLocalNotifications().catch(() => {});
    }
  }, [enableLocalPush]);

  const handleIncomingMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const rawData = JSON.parse(event.data) as Partial<NotificationPayload>;

        const item: NotificationItem = {
          id: rawData.id || event.id || String(Date.now()),
          type: event.event || rawData.type || "notification",
          title: rawData.title || "Notification",
          body: rawData.body || "",
          timestamp: rawData.timestamp || new Date().toISOString(),
          read: rawData.read ?? false,
          data: rawData.data,
          receivedAt: new Date(),
        };

        setNotifications((prev) => [item, ...prev]);
        setLastNotification(item);

        if (enableLocalPush) {
          presentLocalNotification(item).catch(() => {});
        }

        const eventType = item.type;
        const callbacks = listenersRef.current.get(eventType);
        if (callbacks) {
          callbacks.forEach((cb) => {
            try {
              cb(item.data ?? item);
            } catch (err) {
              console.error(`Error in SSE listener for '${eventType}':`, err);
            }
          });
        }
      } catch {
        console.warn("Failed to parse SSE payload:", event.data);
      }
    },
    [enableLocalPush],
  );

  useEffect(() => {
    handleIncomingMessageRef.current = handleIncomingMessage;
  }, [handleIncomingMessage]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !token) {
      if (sseClientRef.current) {
        sseClientRef.current.disconnect(true);
        sseClientRef.current = null;
      }
      setStatus("idle");
      return;
    }

    const baseUrl = process.env.API_URL || "http://localhost:3000";
    const cleanBase = baseUrl.replace(/\/+$/u, "");
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const fullUrl = `${cleanBase}${cleanEndpoint}`;

    const client = new SSEClient({
      url: fullUrl,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
      },
      onMessage: (event) => handleIncomingMessageRef.current(event),
      onError: (err) => {
        console.warn("SSE error:", err);
      },
    });

    sseClientRef.current = client;
    client.connect();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        if (sseClientRef.current?.getStatus() === "disconnected") {
          sseClientRef.current.connect();
        }
      } else if (nextAppState === "background" || nextAppState === "inactive") {
        if (sseClientRef.current) {
          sseClientRef.current.disconnect(false);
        }
      }
    };

    const appStateSub = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      appStateSub.remove();
      if (sseClientRef.current) {
        sseClientRef.current.disconnect(true);
        sseClientRef.current = null;
      }
      setStatus("idle");
    };
  }, [authStatus, token, endpoint, setStatus]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setLastNotification(null);
  }, []);

  const reconnect = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.connect();
    }
  }, []);

  const subscribeToEvent = useCallback(
    <T = unknown,>(eventType: string, callback: (data: T) => void) => {
      const listener = callback as unknown as (
        data: NotificationItem | Record<string, unknown>,
      ) => void;

      if (!listenersRef.current.has(eventType)) {
        listenersRef.current.set(eventType, new Set());
      }
      const set = listenersRef.current.get(eventType)!;
      set.add(listener);

      return () => {
        const currentSet = listenersRef.current.get(eventType);
        if (currentSet) {
          currentSet.delete(listener);
          if (currentSet.size === 0) {
            listenersRef.current.delete(eventType);
          }
        }
      };
    },
    [],
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    status,
    lastNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    reconnect,
    subscribeToEvent,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
