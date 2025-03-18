import { create } from 'zustand';
import { useAuthStore } from './auth';
import { socketService } from '@/lib/socket';
import { FileAttachment } from '@/lib/google-drive';

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  projectId: string;
  dueDate?: Date;
  dueTime?: string;
  reminder?: number; // minutes before due time
  priority: 1 | 2 | 3 | 4;
  isStarred?: boolean;
  isPinned?: boolean;
  category?: string;
  tags?: string[];
  attachments?: FileAttachment[];
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
    occurrences?: number;
  };
  messages?: TaskMessage[];
}

interface TaskMessage {
  id: string;
  task_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

interface TaskState {
  tasks: Task[];
  categories: string[];
  tags: string[];
  addTask: (task: Omit<Task, 'id'>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  addMessage: (taskId: string, message: TaskMessage) => void;
  addCategory: (category: string) => void;
  addTag: (tag: string) => void;
  syncWithDrive: () => Promise<void>;
  uploadAttachment: (taskId: string, file: File) => Promise<void>;
  deleteAttachment: (taskId: string, attachmentId: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  categories: ['Work', 'Personal', 'Shopping', 'Health', 'Education'],
  tags: ['Important', 'Urgent', 'In Progress', 'Blocked', 'Review'],
  addTask: (task) => {
    const newTask = { ...task, id: crypto.randomUUID() };
    set((state) => {
      const newTasks = [...state.tasks, newTask];
      socketService.updateTask(newTask);
      get().syncWithDrive();
      return { tasks: newTasks };
    });
  },
  toggleTask: (id) =>
    set((state) => {
      const newTasks = state.tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      );
      const updatedTask = newTasks.find(task => task.id === id);
      if (updatedTask) {
        socketService.updateTask(updatedTask);
      }
      get().syncWithDrive();
      return { tasks: newTasks };
    }),
  deleteTask: (id) =>
    set((state) => {
      const newTasks = state.tasks.filter((task) => task.id !== id);
      get().syncWithDrive();
      return { tasks: newTasks };
    }),
  updateTask: (id, updatedTask) =>
    set((state) => {
      const newTasks = state.tasks.map((task) =>
        task.id === id ? { ...task, ...updatedTask } : task
      );
      const updated = newTasks.find(task => task.id === id);
      if (updated) {
        socketService.updateTask(updated);
      }
      get().syncWithDrive();
      return { tasks: newTasks };
    }),
  addMessage: (taskId, message) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? { ...task, messages: [...(task.messages || []), message] }
          : task
      ),
    })),
  addCategory: (category) =>
    set((state) => ({
      categories: [...new Set([...state.categories, category])],
    })),
  addTag: (tag) =>
    set((state) => ({
      tags: [...new Set([...state.tags, tag])],
    })),
  syncWithDrive: async () => {
    const googleDrive = useAuthStore.getState().googleDrive;
    if (!googleDrive) return;

    const tasks = get().tasks;
    await googleDrive.saveTasks(tasks);
  },
  uploadAttachment: async (taskId: string, file: File) => {
    const googleDrive = useAuthStore.getState().googleDrive;
    if (!googleDrive) return;

    const attachment = await googleDrive.uploadFile(file, taskId);
    if (attachment) {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                attachments: [...(task.attachments || []), attachment],
              }
            : task
        ),
      }));
      get().syncWithDrive();
    }
  },
  deleteAttachment: async (taskId: string, attachmentId: string) => {
    const googleDrive = useAuthStore.getState().googleDrive;
    if (!googleDrive) return;

    const success = await googleDrive.deleteFile(attachmentId);
    if (success) {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                attachments: (task.attachments || []).filter(
                  (a) => a.id !== attachmentId
                ),
              }
            : task
        ),
      }));
      get().syncWithDrive();
    }
  },
}));