import { Task } from '@/store/tasks'; // Import Task type (TaskData)
import { useAuthStore } from '@/store/auth'; // To get user email
import { useNotificationStore } from '@/store/notifications'; // For error notifications
import axios from 'axios'; // To make API call

// Store timeout IDs for scheduled due time triggers
const scheduledDueTriggers = new Map<string, NodeJS.Timeout>(); // taskId -> timeoutId

/**
 * Calculates the time in milliseconds until the exact due date and time.
 * @param dueDate The task's due date (YYYY-MM-DD string).
 * @param dueTime The task's due time (HH:mm string).
 * @returns Milliseconds until due time, or null if the time is in the past or invalid.
 */
function calculateDueTimeDelay(
  dueDate: string | undefined,
  dueTime: string | undefined
): number | null {
  if (!dueDate) {
    return null; // No date, no trigger
  }

  // Combine date and time, assuming YYYY-MM-DD format for date
  let dueDateTimeString = dueDate;
  if (dueTime) {
    const [hours, minutes] = dueTime.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      // Append time if valid, assuming T separator for better ISO compatibility if needed
      dueDateTimeString += `T${dueTime}:00`;
    } else {
      console.warn(`[DueTrigger] Invalid due time format: ${dueTime}. Triggering at start of day.`);
      dueDateTimeString += `T00:00:00`; // Default to start of day
    }
  } else {
    // If no time, trigger at the start of the due day
    dueDateTimeString += `T00:00:00`;
  }

  try {
    // Use Date.parse for potentially better cross-browser handling of YYYY-MM-DDTHH:mm:ss
    const dueTimestamp = Date.parse(dueDateTimeString);
    if (isNaN(dueTimestamp)) {
        console.warn(`[DueTrigger] Could not parse due date/time string: ${dueDateTimeString}`);
        return null;
    }

    const now = Date.now();
    const delay = dueTimestamp - now;

    // console.log(`[DueTrigger] Calculating due trigger: Due=${new Date(dueTimestamp).toISOString()}, Now=${new Date(now).toISOString()}, Delay=${delay}ms`);

    if (delay <= 0) {
      // console.log("[DueTrigger] Calculated due time is in the past.");
      return null; // Time is in the past
    }
    return delay;
  } catch (e) {
      console.error(`[DueTrigger] Error parsing date/time string "${dueDateTimeString}":`, e);
      return null;
  }
}

/**
 * Function to call the backend API to trigger the email.
 */
async function triggerEmailApi(task: Task) {
    const userEmail = useAuthStore.getState().user?.email;
    if (!userEmail) {
        console.error(`[DueTrigger] Cannot trigger email for task ${task.id}: User email not found.`);
        return;
    }

    console.log(`[DueTrigger] Triggering email API for task "${task.taskTitle}" (ID: ${task.id}) for user ${userEmail}`);
    try {
        // Make POST request to backend endpoint
        await axios.post('/api/send-due-email', {
            email: userEmail,
            taskTitle: task.taskTitle,
            taskDescription: task.description,
            dueDate: task.dueDate,
            dueTime: task.dueTime
        });
        console.log(`[DueTrigger] Successfully called email API for task ${task.id}`);
    } catch (error) {
        console.error(`[DueTrigger] Error calling email API for task ${task.id}:`, error);
        // Optionally notify user via browser notification store
        useNotificationStore.getState().addNotification({
            type: 'error',
            message: `Failed to trigger due email for task "${task.taskTitle}".`
        });
    }
}

/**
 * Schedules the API call trigger for a specific task's due time.
 * @param task The task object.
 */
export function scheduleDueTimeTrigger(task: Task): void {
  // Ensure task is not completed and has a due date
  if (task.status === 'completed' || !task.dueDate) {
    return;
  }

  // Cancel any existing trigger for this task first
  cancelDueTimeTrigger(task.id!); // Use non-null assertion assuming ID exists

  const delay = calculateDueTimeDelay(task.dueDate, task.dueTime);

  if (delay !== null && delay > 0) {
    console.log(`[DueTrigger] Scheduling email trigger for task "${task.taskTitle}" (ID: ${task.id}) in ${delay} ms`);
    const timeoutId = setTimeout(() => {
      triggerEmailApi(task);
      scheduledDueTriggers.delete(task.id!); // Remove from map after triggering
    }, delay);

    scheduledDueTriggers.set(task.id!, timeoutId);
  }
}

/**
 * Cancels a previously scheduled due time trigger for a task.
 * @param taskId The ID of the task (Google Drive File ID).
 */
export function cancelDueTimeTrigger(taskId: string): void {
  if (scheduledDueTriggers.has(taskId)) {
    const timeoutId = scheduledDueTriggers.get(taskId);
    clearTimeout(timeoutId);
    scheduledDueTriggers.delete(taskId);
    console.log(`[DueTrigger] Cancelled scheduled due time trigger for task ${taskId}`);
  }
}

/**
 * Reschedules a due time trigger for a task (cancels existing, schedules new).
 * @param task The updated task object.
 */
export function rescheduleDueTimeTrigger(task: Task): void {
   cancelDueTimeTrigger(task.id!); // Always cancel first
   if (task.status !== 'completed') { // Only schedule if not completed
       scheduleDueTimeTrigger(task);
   }
}

/**
 * Schedules due time triggers for an array of tasks.
 * @param tasks Array of tasks.
 */
export function scheduleDueTimeTriggersForTasks(tasks: Task[]): void {
   console.log(`[DueTrigger] Scheduling initial due time triggers for ${tasks.length} tasks...`);
   tasks.forEach(task => {
       if (task.status !== 'completed' && task.dueDate) {
           scheduleDueTimeTrigger(task);
       }
   });
}

/**
 * Clears all scheduled due time triggers.
 */
export function clearAllDueTimeTriggers(): void {
    console.log(`[DueTrigger] Clearing all ${scheduledDueTriggers.size} scheduled due time triggers.`);
    scheduledDueTriggers.forEach(timeoutId => {
        clearTimeout(timeoutId);
    });
    scheduledDueTriggers.clear();
}
