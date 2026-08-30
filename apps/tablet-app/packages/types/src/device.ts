/**
 * Device-related types shared between API, Dashboard, and Tablet app.
 * These are pure types with no runtime dependencies.
 */

export enum DeviceStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  INACTIVE = "INACTIVE",
}

export interface Device {
  id: string;
  name: string;
  serialNumber?: string;
  shopId: string;
  status: DeviceStatus;
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
