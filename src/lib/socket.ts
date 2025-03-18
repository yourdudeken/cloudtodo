import { io } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';
import { useTaskStore } from '@/store/tasks';

const SOCKET_URL = 'http://localhost:3000';

class SocketService {
  private socket;
  private initialized = false;

  constructor() {
    this.socket = io(SOCKET_URL);
    this.setupListeners();
  }

  private setupListeners() {
    this.socket.on('tasksSynced', (tasks) => {
      useTaskStore.setState({ tasks });
    });

    this.socket.on('taskReminder', ({ taskId, title, dueDate }) => {
      // Show notification
      if (Notification.permission === 'granted') {
        new Notification('Task Reminder', {
          body: `Task "${title}" is due at ${new Date(dueDate).toLocaleTimeString()}`,
        });
      }
    });

    this.socket.on('taskUpdated', (task) => {
      const tasks = useTaskStore.getState().tasks;
      const updatedTasks = tasks.map(t => t.id === task.id ? task : t);
      useTaskStore.setState({ tasks: updatedTasks });
    });

    this.socket.on('newMessage', (message) => {
      // Update chat messages in the UI
      const taskStore = useTaskStore.getState();
      taskStore.addMessage(message.task_id, message);
    });
  }

  initialize() {
    if (this.initialized) return;

    const auth = useAuthStore.getState();
    if (!auth.isAuthenticated || !auth.user) return;

    this.socket.emit('authenticate', {
      userId: auth.user.id,
      accessToken: auth.accessToken,
    });

    this.initialized = true;
  }

  joinTaskChat(taskId: string) {
    this.socket.emit('joinTaskRoom', taskId);
  }

  sendMessage(taskId: string, message: string) {
    const auth = useAuthStore.getState();
    if (!auth.user) return;

    this.socket.emit('chatMessage', {
      taskId,
      message,
      userId: auth.user.id,
    });
  }

  updateTask(task: any) {
    const auth = useAuthStore.getState();
    this.socket.emit('taskUpdate', {
      ...task,
      accessToken: auth.accessToken,
    });
  }
}

export const socketService = new SocketService();