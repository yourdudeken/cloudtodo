import { differenceInMinutes, addMinutes, parseISO } from 'date-fns';
import { Todo } from '../types/todo';
import { api } from './api';

class NotificationService {
  private static instance: NotificationService;
  private checkInterval: number = 60000; // Check every minute
  private intervalId?: number;
  private notifiedTasks: Set<string> = new Set();

  private constructor() {
    this.requestPermission();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.startNotificationCheck();
      }
    }
  }

  private startNotificationCheck() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = window.setInterval(() => {
      this.checkForDueTasks();
    }, this.checkInterval);
  }

  private async checkForDueTasks() {
    const todos = await api.fetchTodos();
    const now = new Date();

    todos.forEach(todo => {
      if (!todo.completed && todo.dueDate && !this.notifiedTasks.has(todo.id)) {
        const dueDate = parseISO(todo.dueDate);
        const minutesUntilDue = differenceInMinutes(dueDate, now);

        // Check for reminder time
        if (todo.reminder) {
          const reminderTime = parseISO(todo.reminder);
          const minutesUntilReminder = differenceInMinutes(reminderTime, now);

          if (minutesUntilReminder <= 1 && minutesUntilReminder > 0) {
            this.showNotification(todo, 'reminder');
            this.sendEmailNotification(todo, 'reminder');
            return;
          }
        }

        // Due date notifications
        const thresholds = [
          { minutes: 24 * 60, message: '24 hours' }, // 1 day before
          { minutes: 60, message: '1 hour' },        // 1 hour before
          { minutes: 30, message: '30 minutes' },    // 30 minutes before
          { minutes: 15, message: '15 minutes' },    // 15 minutes before
          { minutes: 5, message: '5 minutes' }       // 5 minutes before
        ];

        thresholds.forEach(threshold => {
          if (minutesUntilDue <= threshold.minutes && minutesUntilDue > threshold.minutes - 1) {
            this.showNotification(todo, threshold.message);
            this.sendEmailNotification(todo, threshold.message);
            this.notifiedTasks.add(todo.id);
          }
        });

        // Overdue notification
        if (minutesUntilDue < 0 && minutesUntilDue > -5) { // Within 5 minutes of being overdue
          this.showNotification(todo, 'overdue');
          this.sendEmailNotification(todo, 'overdue');
          this.notifiedTasks.add(todo.id);
        }
      }
    });
  }

  private showNotification(todo: Todo, timeframe: string) {
    if (!('Notification' in window)) return;

    let title, body;

    if (timeframe === 'reminder') {
      title = `⏰ Task Reminder: ${todo.title}`;
      body = `It's time for your scheduled task!`;
    } else if (timeframe === 'overdue') {
      title = `⚠️ Task Overdue: ${todo.title}`;
      body = `This task is now overdue!`;
    } else {
      title = `⏰ Upcoming Task: ${todo.title}`;
      body = `This task is due in ${timeframe}.`;
    }

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: todo.id, // Prevents duplicate notifications
      renotify: true,
      requireInteraction: true,
      silent: false,
      data: {
        taskId: todo.id,
        url: window.location.origin + '/task/' + todo.id
      }
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = notification.data.url;
    };
  }

  private async sendEmailNotification(todo: Todo, timeframe: string) {
    try {
      await api.sendReminder(todo);
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  public resetNotification(taskId: string) {
    this.notifiedTasks.delete(taskId);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

export const notificationService = NotificationService.getInstance();