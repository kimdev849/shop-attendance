import { createContext, useContext, useState, ReactNode } from "react";
import type { CheckInResult } from "@shop-attendance/types";

interface IdentifiedWorker {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
}

interface CheckInFlowValue {
  worker: IdentifiedWorker | null;
  setWorker: (w: IdentifiedWorker | null) => void;
  result: (CheckInResult & { queuedOffline?: boolean }) | null;
  setResult: (r: (CheckInResult & { queuedOffline?: boolean }) | null) => void;
  reset: () => void;
}

const CheckInFlowContext = createContext<CheckInFlowValue | undefined>(undefined);

export function CheckInFlowProvider({ children }: { children: ReactNode }) {
  const [worker, setWorker] = useState<IdentifiedWorker | null>(null);
  const [result, setResult] = useState<(CheckInResult & { queuedOffline?: boolean }) | null>(null);

  function reset() {
    setWorker(null);
    setResult(null);
  }

  return (
    <CheckInFlowContext.Provider value={{ worker, setWorker, result, setResult, reset }}>
      {children}
    </CheckInFlowContext.Provider>
  );
}

export function useCheckInFlow() {
  const ctx = useContext(CheckInFlowContext);
  if (!ctx) throw new Error("useCheckInFlow must be used within a CheckInFlowProvider");
  return ctx;
}
