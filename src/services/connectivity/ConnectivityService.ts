import NetInfo from "@react-native-community/netinfo";
import type { ConnectivityStatus, ConnectivitySubscriber } from "./ConnectivityStatus";

type BrowserNavigator = {
  onLine?: boolean;
};

const getNavigator = (): BrowserNavigator | undefined => {
  const maybeNavigator = (globalThis as { navigator?: BrowserNavigator }).navigator;

  return typeof maybeNavigator === "object" && maybeNavigator !== null ? maybeNavigator : undefined;
};

const getGlobalListener = (): {
  addEventListener?: (event: string, listener: () => void) => void;
  removeEventListener?: (event: string, listener: () => void) => void;
} => globalThis as {
  addEventListener?: (event: string, listener: () => void) => void;
  removeEventListener?: (event: string, listener: () => void) => void;
};

const hasWebConnectivity = (): boolean => typeof getNavigator()?.onLine === "boolean";

const createStatus = (
  isOnline: boolean,
  source: ConnectivityStatus["source"],
): ConnectivityStatus => ({
  state: isOnline ? "online" : "offline",
  isOnline,
  checkedAt: new Date().toISOString(),
  source,
});

export class ConnectivityService {
  private status: ConnectivityStatus = createStatus(true, "fallback");
  private readonly subscribers = new Set<ConnectivitySubscriber>();
  private nativeUnsubscribe: (() => void) | null = null;
  private initialized = false;

  initialize(): ConnectivityStatus {
    if (this.initialized) return this.status;

    this.initialized = true;
    this.refresh();

    const listenerTarget = getGlobalListener();

    if (typeof listenerTarget.addEventListener === "function") {
      listenerTarget.addEventListener("online", this.handleOnline);
      listenerTarget.addEventListener("offline", this.handleOffline);
    }

    if (!hasWebConnectivity()) {
      this.initializeNativeListener();
      void this.refreshNative();
    }

    return this.status;
  }

  getStatus(): ConnectivityStatus {
    this.initialize();

    return this.status;
  }

  async isOnline(): Promise<boolean> {
    return this.getStatus().isOnline;
  }

  refresh(): ConnectivityStatus {
    const navigator = getNavigator();

    if (typeof navigator?.onLine === "boolean") {
      this.setStatus(createStatus(navigator.onLine, "web"));
      return this.status;
    }

    void this.refreshNative();

    this.setStatus({
      state: "unknown",
      isOnline: true,
      checkedAt: new Date().toISOString(),
      source: "fallback",
    });

    return this.status;
  }

  subscribe(subscriber: ConnectivitySubscriber): () => void {
    this.initialize();
    this.subscribers.add(subscriber);
    subscriber(this.status);

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  setManualStatus(isOnline: boolean): ConnectivityStatus {
    this.setStatus(createStatus(isOnline, "manual"));

    return this.status;
  }

  dispose(): void {
    const listenerTarget = getGlobalListener();

    if (typeof listenerTarget.removeEventListener === "function") {
      listenerTarget.removeEventListener("online", this.handleOnline);
      listenerTarget.removeEventListener("offline", this.handleOffline);
    }

    this.nativeUnsubscribe?.();
    this.nativeUnsubscribe = null;
    this.subscribers.clear();
    this.initialized = false;
  }

  private readonly handleOnline = (): void => {
    this.setStatus(createStatus(true, "web"));
  };

  private readonly handleOffline = (): void => {
    this.setStatus(createStatus(false, "web"));
  };

  private initializeNativeListener(): void {
    if (this.nativeUnsubscribe) return;

    try {
      this.nativeUnsubscribe = NetInfo.addEventListener((state) => {
        const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);

        this.setStatus(createStatus(isOnline, "native"));
      });
    } catch {
      this.nativeUnsubscribe = null;
    }
  }

  private async refreshNative(): Promise<void> {
    try {
      const state = await NetInfo.fetch();
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);

      this.setStatus(createStatus(isOnline, "native"));
    } catch {
      // Some runtimes may not have the native module linked yet. The existing
      // browser/fallback status remains usable in that case.
    }
  }

  private setStatus(status: ConnectivityStatus): void {
    this.status = status;
    this.subscribers.forEach((subscriber) => subscriber(status));
  }
}

export const connectivityService = new ConnectivityService();
