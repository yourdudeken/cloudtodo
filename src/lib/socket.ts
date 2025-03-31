import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';
import { useTaskStore, Task } from '@/store/tasks'; // Import Task type
import { useNotificationStore } from '@/store/notifications'; // Import notification store
import { taskCache } from './cache'; // Import taskCache
import { FileAttachment, TaskComment } from '@/lib/google-drive'; // Import TaskComment and FileAttachment
import {
  scheduleNotificationsForTasks, // Renamed import
  clearAllScheduledNotifications, // Added import
  scheduleTaskNotification, // Renamed import
  cancelTaskNotification, // Renamed import
  rescheduleTaskNotification // Added import
} from './browser-notifications'; // Import notification utilities

// Define the shape of the task data expected from the server
// Note: Adjust these interfaces based on the actual data structure sent by your server
interface ServerAttachment {
  id: string;
  name: string;
  mimeType?: string; // Make optional initially if data might be missing
  size?: number;
  thumbnailUrl?: string;
  downloadUrl: string;
}

interface ServerComment {
  id: string;
  taskId: string;
  userId: string;
  userEmail: string;
  content: string;
  createdAt: string; // Expect ISO string
}

interface ServerCollaborator {
  id: string;
  userId: string;
  userEmail: string;
  role: 'viewer' | 'editor';
  createdAt: string; // Expect ISO string
}

// Adjust ServerTask to reflect potential structure from server/Google Drive
interface ServerTask extends Omit<Task, 'dueDate' | 'createdAt' | 'attachments' | 'comments' | 'collaborators'> {
  dueDate?: string | null; // Allow null for dueDate from server
  createdAt: string | number; // Allow number or string for createdAt
  attachments?: ServerAttachment[];
  comments?: ServerComment[];
  collaborators?: ServerCollaborator[];
  // userId?: string; // Removed userId field
}


// Helper to convert server task to client task format
const convertServerTaskToClient = (serverTask: ServerTask): Task => ({
  ...serverTask,
  // Ensure required fields have defaults if not provided by the server
  title: serverTask.title || 'Untitled Task',
  completed: serverTask.completed ?? false,
  priority: serverTask.priority ?? 4,
  projectId: serverTask.projectId || 'inbox',
  isStarred: serverTask.isStarred ?? false,
  isPinned: serverTask.isPinned ?? false,
  taskType: serverTask.taskType || 'personal',
  // Convert dates and handle potential nulls/undefined
  // Ensure dueDate is parsed correctly, whether it's a string or already a Date object (less likely from JSON)
  dueDate: serverTask.dueDate ? new Date(serverTask.dueDate) : undefined,
  // Handle both string (ISO) and number (timestamp) formats for createdAt
  createdAt: typeof serverTask.createdAt === 'string' ? new Date(serverTask.createdAt).getTime() : (serverTask.createdAt || Date.now()),
  // Ensure optional arrays are initialized and attachments have defaults
  tags: serverTask.tags || [],
  attachments: (serverTask.attachments || []).map(att => ({
      id: att.id,
      name: att.name || 'Unnamed File',
      mimeType: att.mimeType || 'application/octet-stream', // Default mimeType
      size: att.size || 0,
      thumbnailUrl: att.thumbnailUrl,
      downloadUrl: att.downloadUrl || '#',
  })),
  collaborators: serverTask.collaborators || [],
  comments: serverTask.comments || [],
  // userId: serverTask.userId, // Removed userId mapping
});

const SOCKET_URL = 'http://localhost:3000';

class SocketService {
  private socket: Socket; // Add type annotation
  private initialized = false;

  constructor() {
    // Explicitly type the socket connection
    this.socket = io(SOCKET_URL, {
      autoConnect: false, // Don't connect automatically, wait for initialize()
      // Optional: Add connection options if needed
      // transports: ['websocket'], // Example: Force websocket
    });
    this.setupListeners();
  }

  private setupListeners() {
    this.socket.on('tasksSynced', (serverTasks: ServerTask[]) => { // Add type annotation
      console.log('[Socket] Received tasksSynced:', serverTasks);
      // Check if tasks is null or undefined before setting state
      if (serverTasks && Array.isArray(serverTasks)) {
        const tasks = serverTasks.map(convertServerTaskToClient); // Convert tasks
        useTaskStore.setState({ tasks });
        taskCache.setTasks(tasks); // Update cache
        scheduleNotificationsForTasks(tasks); // Schedule/resync all browser notifications
        console.log('Task store updated and browser notifications synced.');
      } else {
        console.warn('Received invalid data for tasksSynced event. Not updating store.', serverTasks);
      }
    });

    // Remove the old 'taskReminder' listener, as reminders are now handled client-side
    this.socket.off('taskReminder'); // Ensure any old listener is removed

    this.socket.on('taskUpdated', (serverTask: ServerTask) => { // Add type annotation
      console.log('[Socket] Received taskUpdated:', serverTask);
      const updatedTask = convertServerTaskToClient(serverTask); // Convert task
      useTaskStore.setState((state) => ({
        tasks: state.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
      }));
      taskCache.setTasks(useTaskStore.getState().tasks); // Update cache
      // Reschedule or cancel browser notification based on update
      rescheduleTaskNotification(updatedTask); // Use reschedule which handles completed status internally
      console.log(`Browser notification rescheduled/cancelled for updated task ${updatedTask.id}`);
    });

    this.socket.on('taskAdded', (serverTask: ServerTask) => { // Add type annotation
      console.log('[Socket] Received taskAdded:', serverTask);
      const newTask = convertServerTaskToClient(serverTask); // Convert task
      useTaskStore.setState((state) => ({ tasks: [...state.tasks, newTask] }));
      taskCache.setTasks(useTaskStore.getState().tasks); // Update cache
      useNotificationStore.getState().addNotification({ type: 'success', message: `Task "${newTask.title}" added.` });
      scheduleTaskNotification(newTask); // Schedule browser notification for the new task
      console.log(`Browser notification scheduled for new task ${newTask.id}`);
    });

    this.socket.on('taskDeleted', (taskId: string) => { // Add type annotation
      console.log('[Socket] Received taskDeleted:', taskId);
      useTaskStore.setState((state) => ({
        tasks: state.tasks.filter((t) => t.id !== taskId),
      }));
      taskCache.setTasks(useTaskStore.getState().tasks); // Update cache
      cancelTaskNotification(taskId); // Cancel any scheduled browser notification
      console.log(`Browser notification cancelled for deleted task ${taskId}`);
    });

    this.socket.on('taskError', ({ action, taskId, message }) => {
      console.error(`Task Error (${action}):`, message, taskId ? `(Task ID: ${taskId})` : '');
      useNotificationStore.getState().addNotification({ type: 'error', message: `Task Error (${action}): ${message}` });
    });

    this.socket.on('newMessage', (message: ServerComment) => { // Add type annotation
      // Update chat messages (comments) in the UI
      if (message && message.taskId && message.content) {
          // Convert server comment format if necessary
          const newComment: TaskComment = {
              id: message.id || crypto.randomUUID(), // Use ID from message if available
              userId: message.userId,
              userEmail: message.userEmail || 'Unknown',
              content: message.content,
              createdAt: message.createdAt || new Date().toISOString(),
          };

          useTaskStore.setState(state => ({
              tasks: state.tasks.map(task =>
                  task.id === message.taskId
                      ? { ...task, comments: [...(task.comments || []), newComment] }
                      : task
              )
          }));
          // No need to update taskCache here unless comments are part of the main task cache logic
      } else {
          console.warn('Received incomplete newMessage data:', message);
      }
    });
  }

  initialize() {
    if (this.initialized || this.socket.connected) return; // Prevent multiple initializations

    const auth = useAuthStore.getState();
    if (!auth.isAuthenticated || !auth.user) { // Check if user exists
      console.log('Socket initialization skipped: User not authenticated.');
      return;
    }

    console.log('Initializing socket connection...');
    this.socket.connect(); // Connect if not already connected

    this.socket.off('connect'); // Remove previous listener to avoid duplicates
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      // Ensure user still exists before emitting
      const currentUser = useAuthStore.getState().user;
      if (currentUser && currentUser.email) { // Ensure email exists
        // Authenticate with server using userId and email
        this.socket.emit('authenticate', {
          userId: currentUser.id,
          email: currentUser.email, // Send email
        });
        // Also register the user for broadcasting
        this.socket.emit('registerUser', currentUser.id);
        this.initialized = true;
        console.log('Socket initialized and authenticated.');
      } else {
        console.error('Socket connected but user became null during connection.');
        this.socket.disconnect(); // Disconnect if user is somehow null now
      }
    });

    this.socket.off('disconnect'); // Remove previous listener
    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.initialized = false; // Reset initialization status
      clearAllScheduledNotifications(); // Clear notifications on disconnect
      // Optionally attempt to reconnect or notify the user
    });

    this.socket.off('connect_error'); // Remove previous listener
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.initialized = false;
      // Optionally notify the user
    });
  }

  joinTaskChat(taskId: string) {
    this.socket.emit('joinTaskRoom', taskId);
  }

  sendMessage(taskId: string, message: string) {
    const auth = useAuthStore.getState();
    if (!auth.user) { // Check if user exists
        console.error("Cannot send message: User not logged in.");
        return;
    }

    this.socket.emit('chatMessage', {
      taskId,
      message,
      userId: auth.user.id,
      userEmail: auth.user.email // Send email along with message
    });
  }

  updateTask(task: Partial<Task>) { // Use Partial<Task> for better type safety
    if (!this.socket.connected) {
      console.error("Socket not connected. Cannot update task.");
      useNotificationStore.getState().addNotification({ type: 'error', message: 'Connection error. Could not update task.' });
      return;
    }
    this.socket.emit('taskUpdate', {
      task // Send only the task data
    });
  }

  addTask(task: Omit<Task, 'id' | 'createdAt'>) { // Use more specific type
    if (!this.socket.connected) {
      console.error("Socket not connected. Cannot add task.");
      useNotificationStore.getState().addNotification({ type: 'error', message: 'Connection error. Could not add task.' });
      return;
    }
    this.socket.emit('addTask', {
      task // Send only the new task data
    });
  }

  deleteTask(taskId: string) {
    if (!this.socket.connected) {
      console.error("Socket not connected. Cannot delete task.");
      useNotificationStore.getState().addNotification({ type: 'error', message: 'Connection error. Could not delete task.' });
      return;
    }
    this.socket.emit('deleteTask', {
      taskId
    });
  }
}

export const socketService = new SocketService();
