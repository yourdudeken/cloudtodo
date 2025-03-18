import { useAuthStore } from '@/store/auth';

class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';

  private constructor() {
    this.initializePermission();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async initializePermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    this.permission = await Notification.requestPermission();
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === 'granted';
  }

  public async showNotification(title: string, options?: NotificationOptions) {
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    return new Notification(title, {
      icon: '/notification-icon.png',
      badge: '/notification-badge.png',
      ...options,
    });
  }

  public async scheduleNotification(
    title: string,
    options: NotificationOptions,
    date: Date
  ) {
    const now = new Date();
    const delay = date.getTime() - now.getTime();

    if (delay <= 0) return;

    setTimeout(() => {
      this.showNotification(title, options);
    }, delay);
  }
}

export const notificationService = NotificationService.getInstance();