export type ConnectivityState = "online" | "offline" | "unknown";

export type ConnectivityStatus = {
  state: ConnectivityState;
  isOnline: boolean;
  checkedAt: string;
  source: "web" | "native" | "manual" | "fallback";
};

export type ConnectivitySubscriber = (status: ConnectivityStatus) => void;
