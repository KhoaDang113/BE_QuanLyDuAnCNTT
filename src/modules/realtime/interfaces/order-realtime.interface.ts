export interface OrderProcessingPayload {
  jobId: string;
  message: string;
}

export interface OrderSuccessPayload {
  jobId: string;
  orderId: string;
  message: string;
  order: any;
}

export interface OrderErrorPayload {
  jobId: string;
  message: string;
  error: string;
}

// Staff notification payloads
export interface NewOrderNotificationPayload {
  notificationId: string;
  type: string;
  title: string;
  message: string;
  link: string;
  actor: {
    id: string;
    name: string;
    avatar?: string;
  };
  // order: any;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface OrderStatusUpdatedPayload {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  message: string;
  timestamp: Date;
  updatedBy?: string; // staff ID who updated
  order?: any;
}

export interface NewOrderPayload {
  orderId: string;
  message: string;
  order: any;
}


export interface OrderUpdatedPayload {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  message: string;
  timestamp: Date;
  order?: any;
}
