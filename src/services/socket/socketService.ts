import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';
// Remove duplicate import below
// import { useAuthStore } from '@/store/auth';
// Remove imports related to task store, Task type, notifications, cache if only used for task sync
// import { useTaskStore, Task } from '@/store/tasks';
//import { useNotificationStore } from '@/store/notifications'; // Keep for general notifications?
// import { taskCache } from './cache';
// Remove browser notification imports if only used for task sync
import {
  // scheduleNotificationsForTasks,
  clearAllScheduledNotifications, // Keep for disconnect
  // scheduleTaskNotification,
  // cancelTaskNotification,
  // rescheduleTaskNotification
} from './browser-notifications';

// Remove local TaskComment definition if comments aren't handled via socket anymore
// interface TaskComment { ... }

// Remove Server* interfaces if not used
// interface ServerAttachment { ... }
// interface ServerComment { ... }
// interface ServerCollaborator { ... }
// interface ServerTask { ... }

// Remove convertServerTaskToClient function
// const convertServerTaskToClient = (serverTask: ServerTask): Task => { ... };


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
    // Remove task-related listeners
    this.socket.off('tasksSynced');
    this.socket.off('taskUpdated');
    this.socket.off('taskAdded');
    this.socket.off('taskDeleted');
    this.socket.off('taskError');
    this.socket.off('taskReminder');

    // Keep newMessage listener for now, but comment out state update
    // as Task type no longer has 'comments'
    this.socket.on('newMessage', (message: any) => { // Use 'any' for now
      console.log('[Socket] Received newMessage:', message);
      // TODO: Implement comment handling if needed, separate from task store?
      /*
      if (message && message.taskId && message.content) {
          const newComment = {
              id: message.id || crypto.randomUUID(),
              userId: message.userId,
              userEmail: message.userEmail || 'Unknown',
              content: message.content,
              createdAt: message.createdAt || new Date().toISOString(),
          };
          // Cannot update useTaskStore directly anymore
          // Find alternative way to display/store comments
          console.log('Need to handle comment display:', newComment);
      } else {
          console.warn('Received incomplete newMessage data:', message);
      }
      */
    });

    // Keep connection listeners
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      const currentUser = useAuthStore.getState().user;
      if (currentUser && currentUser.email) {
        this.socket.emit('authenticate', {
          userId: currentUser.id,
          email: currentUser.email,
        });
        this.socket.emit('registerUser', currentUser.id);
        this.initialized = true;
        console.log('Socket authenticated.');
      } else {
        console.error('Socket connected but user became null during connection.');
        this.disconnect(); // Disconnect if user is somehow null now
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.initialized = false;
      clearAllScheduledNotifications(); // Clear notifications on disconnect
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.initialized = false;
    });
  }

  // Add a public method to disconnect the socket
  disconnect() {
    if (this.socket.connected) {
      console.log('Disconnecting socket...');
      this.socket.disconnect();
      this.initialized = false; // Reset initialization status
      clearAllScheduledNotifications(); // Clear notifications on manual disconnect too
    }
  }

  initialize() {
    if (this.initialized || this.socket.connected) return; // Prevent multiple initializations

    const auth = useAuthStore.getState();
    if (!auth.isAuthenticated || !auth.user) { // Check if user exists
      console.log('Socket initialization skipped: User not authenticated.');
      return;
    }

      console.log('Initializing socket connection...');
    // Ensure listeners are set up before connecting
    // this.setupListeners(); // Already called in constructor
    this.socket.connect();
  }

  // Keep joinTaskChat and sendMessage if chat functionality is still used
  joinTaskChat(taskId: string) {
    if (!this.socket.connected) {
        console.warn("Socket not connected. Cannot join task room.");
        return;
    }
    console.log(`[Socket] Joining room: ${taskId}`);
    this.socket.emit('joinTaskRoom', taskId);
  }

  sendMessage(taskId: string, message: string) {
    const auth = useAuthStore.getState();
    if (!auth.user) {
        console.error("Cannot send message: User not logged in.");
        return;
    }
     if (!this.socket.connected) {
        console.warn("Socket not connected. Cannot send message.");
        // Optionally queue message or notify user
        return;
    }
    console.log(`[Socket] Sending message to room ${taskId}: ${message}`);
    this.socket.emit('chatMessage', {
      taskId,
      message,
      userId: auth.user.id,
      userEmail: auth.user.email
    });
  }

  // Remove task-related methods
  // updateTask(task: Partial<Task>) { ... }
  // addTask(task: Omit<Task, 'id' | 'createdAt'>) { ... }
  // deleteTask(taskId: string) { ... }
}

export const socketService = new SocketService();
