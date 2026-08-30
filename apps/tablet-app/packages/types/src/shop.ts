/**
 * Shop-related types shared between API, Dashboard, and Tablet app.
 * These are pure types with no runtime dependencies.
 */

export enum ShopStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export interface Shop {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  status: ShopStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShopWithCounts extends Shop {
  _count: {
    workers: number;
    devices: number;
  };
}
