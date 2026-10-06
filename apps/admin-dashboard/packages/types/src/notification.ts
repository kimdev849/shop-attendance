/**
 * Notification-related types shared between API, Dashboard, and Tablet app.
 * These are pure types with no runtime dependencies.
 */

export enum NotificationType {
  LATE_CHECK_IN = "LATE_CHECK_IN",
  ABSENCE = "ABSENCE",
  PENALTY = "PENALTY",
  SYSTEM = "SYSTEM",
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entity?: string | null;
  entityId?: string | null;
  readAt: string | Date | null;
  createdAt: string | Date;
}
