import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import * as Notifications from "expo-notifications";
import type { EventSubscription, Notification } from "expo-notifications";
import { registerForPushNotificationsAsync } from "../utils/registerForPushNotificationAsync";

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notification | null;
  error: Error | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then(setExpoPushToken)
      .catch(setError);

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("🔔 Notification Received: ", notification);
        setNotification(notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        // console.log("🔔 Notification Response:", response);
        // Optional: handle tap/click on notification here
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ expoPushToken, notification, error }}>
      {children}
    </NotificationContext.Provider>
  );
};
