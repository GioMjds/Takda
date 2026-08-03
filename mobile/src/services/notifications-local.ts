import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { NotificationItem } from "@/types/notifications";

export async function initLocalNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default Notifications",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  } catch (error) {
    console.warn("Failed to request notification permissions:", error);
    return false;
  }
}

export async function presentLocalNotification(
  item: NotificationItem,
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title || "New Notification",
        body: item.body || "",
        data: item.data || { id: item.id, type: item.type },
        sound: "default",
      },
      trigger: null, // Display immediately
    });
  } catch (error) {
    console.warn("Failed to present local notification:", error);
  }
}
