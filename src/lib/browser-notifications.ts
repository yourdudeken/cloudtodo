/**
 * Requests permission from the user to show browser notifications.
 * Logs the outcome to the console.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support desktop notification');
    return 'denied';
  }

  const currentPermission = Notification.permission;
  console.log('Current notification permission:', currentPermission);

  if (currentPermission === 'granted') {
    return 'granted';
  }

  if (currentPermission === 'denied') {
    console.warn('Notification permission was previously denied.');
    // Optionally: Guide user on how to re-enable if needed.
    return 'denied';
  }

  // Only request if permission is 'default'
  if (currentPermission === 'default') {
    const permission = await Notification.requestPermission();
    console.log('Notification permission request result:', permission);
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      // Optionally send a test notification
      // sendNotification('Notifications Enabled', { body: 'You will now receive task reminders.' });
    } else {
      console.warn('Notification permission denied.');
    }
    return permission;
  }

  return currentPermission; // Should not happen if logic is correct
}

/**
 * Sends a browser notification if permission has been granted.
 * @param title The title of the notification.
 * @param options Standard Notification API options (body, icon, etc.).
 */
export function sendNotification(title: string, options?: NotificationOptions): void {
  if (!('Notification' in window)) {
    console.warn('Browser does not support desktop notification');
    return;
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, options);
    // Optional: Handle notification click/close events
    notification.onclick = () => {
      console.log('Notification clicked');
      // Example: Focus the window/tab
      window.focus();
    };
  } else if (Notification.permission === 'default') {
    console.log('Notification permission not yet granted or denied. Requesting...');
    requestNotificationPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, options);
      }
    });
  } else {
    console.warn('Notification permission denied. Cannot send notification.');
  }
}

// --- Reminder Scheduling Logic ---
import { Task } from '@/store/tasks'; // Import Task type

// Store timeout IDs for scheduled notifications (using NodeJS.Timeout for browser compatibility)
const scheduledNotifications = new Map<string, NodeJS.Timeout>(); // taskId -> timeoutId

/**
 * Calculates the time in milliseconds until a notification should be triggered.
 * @param dueDate The task's due date.
 * @param dueTime The task's due time (HH:mm).
 * @param reminderMinutes Minutes before the due time to send the notification.
 * @returns Milliseconds until notification, or null if the time is in the past or invalid.
 */
function calculateNotificationTime(
  dueDate: Date | undefined | string, // Allow string for initial load from store/cache
  dueTime: string | undefined,
  reminderMinutes: number | undefined
): number | null {
  if (!dueDate || !reminderMinutes || reminderMinutes <= 0) {
    return null;
  }

  // Ensure dueDate is a Date object
  const validDueDate = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  if (!(validDueDate instanceof Date) || isNaN(validDueDate.getTime())) {
      console.warn("Invalid due date provided for notification calculation:", dueDate);
      return null; // Invalid date
  }


  // Combine date and time
  let dueDateTime = new Date(validDueDate); // Use the validated Date object
  if (dueTime) {
    const [hours, minutes] = dueTime.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      // Set time based on local timezone interpretation of the date part
      dueDateTime.setHours(hours, minutes, 0, 0);
    } else {
      // If time is invalid, maybe default to start of day?
      dueDateTime.setHours(0, 0, 0, 0);
       console.warn("Invalid due time provided, defaulting to start of day:", dueTime);
    }
  } else {
    // If no time, default to start of the day
    dueDateTime.setHours(0, 0, 0, 0);
  }

  const notificationTimestamp = dueDateTime.getTime() - reminderMinutes * 60 * 1000;
  const now = Date.now();
  const delay = notificationTimestamp - now;

  // console.log(`Calculating reminder: Due=${dueDateTime.toISOString()}, Reminder=${reminderMinutes}min, NotifyAt=${new Date(notificationTimestamp).toISOString()}, Now=${new Date(now).toISOString()}, Delay=${delay}ms`);


  if (delay <= 0) {
    // console.log("Calculated notification time is in the past.");
    return null; // Time is in the past
  }

  return delay;
}

/**
 * Schedules a browser notification for a specific task reminder.
 * @param task The task object.
 */
export function scheduleTaskNotification(task: Task): void {
  // Ensure task is not completed and has necessary details
  if (task.status === 'completed' || !task.dueDate || !task.reminder) {
    // console.log(`Not scheduling notification for task ${task.id}: Completed or missing due date/reminder.`);
    return;
  }

  // Cancel any existing notification for this task first
  if (task.id) cancelTaskNotification(task.id);

  const delay = calculateNotificationTime(task.dueDate, task.dueTime, task.reminder);

  if (delay !== null && delay > 0) {
    console.log(`Scheduling notification for task "${task.taskTitle}" (ID: ${task.id}) in ${delay} ms`);
    const timeoutId = setTimeout(() => {
      console.log(`Sending notification for task "${task.taskTitle}" (ID: ${task.id})`);
      sendNotification(`Task Reminder: ${task.taskTitle}`, {
        body: task.description || 'Due soon!',
        // Add other options like icon if needed
         // icon: '/path/to/icon.png'
         tag: task.id, // Use task ID as tag to potentially replace/update notifications
         // renotify: true, // Removed non-standard option
       });
       if (task.id) scheduledNotifications.delete(task.id); // Remove from map after sending
     }, delay);

    if (task.id) scheduledNotifications.set(task.id, timeoutId);
  } else {
     // console.log(`Not scheduling notification for task ${task.id}: Calculated time is invalid or in the past.`);
  }
}

/**
 * Cancels a previously scheduled notification for a task.
 * @param taskId The ID of the task.
 */
export function cancelTaskNotification(taskId: string): void {
  if (scheduledNotifications.has(taskId)) {
    const timeoutId = scheduledNotifications.get(taskId);
    clearTimeout(timeoutId);
    scheduledNotifications.delete(taskId);
    console.log(`Cancelled scheduled notification for task ${taskId}`);
  }
}

/**
 * Reschedules a notification for a task (cancels existing, schedules new).
 * Useful when task details (due date, reminder, completion status) change.
 * @param task The updated task object.
 */
export function rescheduleTaskNotification(task: Task): void {
   // console.log(`Rescheduling notification check for task ${task.id}`);
   if (task.id) cancelTaskNotification(task.id); // Always cancel first
   if (task.status !== 'completed') { // Only schedule if not completed
       scheduleTaskNotification(task);
   }
}

/**
 * Schedules notifications for an array of tasks, typically on initial load.
 * @param tasks Array of tasks.
 */
export function scheduleNotificationsForTasks(tasks: Task[]): void {
   console.log(`Scheduling initial notifications for ${tasks.length} tasks...`);
   tasks.forEach(task => {
       // Check if task is relevant for notification (not completed, has reminder & due date)
       if (task.status !== 'completed' && task.dueDate && task.reminder) {
           scheduleTaskNotification(task);
       }
   });
}

/**
 * Clears all scheduled notifications.
 */
export function clearAllScheduledNotifications(): void {
    console.log(`Clearing all ${scheduledNotifications.size} scheduled notifications.`);
    scheduledNotifications.forEach(timeoutId => {
        clearTimeout(timeoutId);
    });
    scheduledNotifications.clear();
}
