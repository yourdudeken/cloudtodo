import { useNotificationStore } from '@/store/notifications';

export class ConnectionMonitor {
  private static instance: ConnectionMonitor;
  private isOnline: boolean = navigator.onLine;
  private reconnectCallbacks: (() => void)[] = [];

  private constructor() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  static getInstance(): ConnectionMonitor {
    if (!ConnectionMonitor.instance) {
      ConnectionMonitor.instance = new ConnectionMonitor();
    }
    return ConnectionMonitor.instance;
  }

  private handleOnline() {
    this.isOnline = true;
    useNotificationStore.getState().addNotification({
      type: 'success',
      message: 'Connection restored'
    });
    this.reconnectCallbacks.forEach(callback => callback());
  }

  private handleOffline() {
    this.isOnline = false;
    useNotificationStore.getState().addNotification({
      type: 'warning',
      message: 'Connection lost. Some features may be unavailable.'
    });
  }

  public onReconnect(callback: () => void) {
    this.reconnectCallbacks.push(callback);
  }

  public removeReconnectCallback(callback: () => void) {
    this.reconnectCallbacks = this.reconnectCallbacks.filter(cb => cb !== callback);
  }

  public isConnected(): boolean {
    return this.isOnline;
  }
}

export const connectionMonitor = ConnectionMonitor.getInstance();