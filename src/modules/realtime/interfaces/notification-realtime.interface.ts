export interface NotificationPayload {
  notificationId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  actor: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  metadata?: Record<string, any>;
}
