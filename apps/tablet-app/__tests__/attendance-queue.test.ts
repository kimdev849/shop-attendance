import AsyncStorage from "@react-native-async-storage/async-storage";
import { enqueueAttendance, getQueue, removeFromQueue, queueSize } from "../storage/attendance-queue";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

describe("attendance-queue (offline storage)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("démarre vide", async () => {
    expect(await queueSize()).toBe(0);
  });

  it("ajoute un pointage à la file", async () => {
    await enqueueAttendance({
      workerId: "w1",
      shopId: "s1",
      deviceId: "d1",
      clientTimestamp: new Date().toISOString(),
      clientRequestId: "req-1",
      biometricConfirmed: true,
      queuedAt: new Date().toISOString(),
    });

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].clientRequestId).toBe("req-1");
  });

  it("ne retire de la file que les clientRequestId confirmés par le serveur", async () => {
    await enqueueAttendance({
      workerId: "w1",
      shopId: "s1",
      deviceId: "d1",
      clientTimestamp: new Date().toISOString(),
      clientRequestId: "req-1",
      biometricConfirmed: true,
      queuedAt: new Date().toISOString(),
    });
    await enqueueAttendance({
      workerId: "w2",
      shopId: "s1",
      deviceId: "d1",
      clientTimestamp: new Date().toISOString(),
      clientRequestId: "req-2",
      biometricConfirmed: true,
      queuedAt: new Date().toISOString(),
    });

    await removeFromQueue(["req-1"]);

    const remaining = await getQueue();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].clientRequestId).toBe("req-2");
  });
});
