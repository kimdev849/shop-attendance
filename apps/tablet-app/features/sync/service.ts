/**
 * Sync feature service for tablet app.
 * Handles offline queue management and synchronization.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { attendanceFeatureApi, SyncAttendanceItem } from "../attendance/api";

const ATTENDANCE_QUEUE_KEY = "@shopattendance:attendance_queue";

export interface QueueItem extends SyncAttendanceItem {
  timestamp: string;
  retryCount: number;
}

export const syncService = {
  /**
   * Add an attendance record to the offline queue.
   */
  async addToQueue(item: SyncAttendanceItem): Promise<void> {
    const queue = await this.getQueue();
    const queueItem: QueueItem = {
      ...item,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(queueItem);
    await AsyncStorage.setItem(ATTENDANCE_QUEUE_KEY, JSON.stringify(queue));
  },

  /**
   * Get the current offline queue.
   */
  async getQueue(): Promise<QueueItem[]> {
    const data = await AsyncStorage.getItem(ATTENDANCE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Clear the offline queue.
   */
  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(ATTENDANCE_QUEUE_KEY);
  },

  /**
   * Remove a specific item from the queue by clientRequestId.
   */
  async removeFromQueue(clientRequestId: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((item) => item.clientRequestId !== clientRequestId);
    await AsyncStorage.setItem(ATTENDANCE_QUEUE_KEY, JSON.stringify(filtered));
  },

  /**
   * Check if the device is online.
   */
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  },

  /**
   * Sync all queued items to the server.
   * Returns results for each item.
   */
  async syncAll(): Promise<{ synced: number; failed: number; errors: string[] }> {
    const queue = await this.getQueue();
    if (queue.length === 0) {
      return { synced: 0, failed: 0, errors: [] };
    }

    const isOnline = await this.isOnline();
    if (!isOnline) {
      return { synced: 0, failed: 0, errors: ["Device is offline"] };
    }

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      const results = await attendanceFeatureApi.sync(queue);

      for (const result of results) {
        if (result.status === "CREATED" || result.status === "DUPLICATE") {
          await this.removeFromQueue(result.clientRequestId);
          synced++;
        } else {
          failed++;
          errors.push(`${result.clientRequestId}: ${result.error ?? "Unknown error"}`);
        }
      }
    } catch (error: any) {
      failed = queue.length;
      errors.push(error.message ?? "Sync failed");
    }

    return { synced, failed, errors };
  },

  /**
   * Get the number of items in the queue.
   */
  async getQueueSize(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  },
};
