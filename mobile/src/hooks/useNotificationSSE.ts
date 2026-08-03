import { useContext } from "react";
import {
  NotificationContext,
  NotificationContextValue,
} from "@/providers/NotificationProvider";

export function useNotificationsSSE(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationsSSE must be used within a NotificationProvider",
    );
  }
  return context;
}
