import { create } from 'zustand';
import { useAuthStore } from './auth';
import { socketService } from '@/lib/socket';
import { FileAttachment } from '@/lib/google-drive';
import { useNotificationStore } from './notifications';
import { taskCache } from '@/lib/cache';

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  projectId: string;
  dueDate?: Date;
  dueTime?: string;
  reminder?: number;
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
  collaborators?: {
    id: string;
    userId: string;
    userEmail: string;
    role: 'viewer' | 'editor';
    createdAt: string;
  }[];
  comments?: {
    id: string;
    userId: string;
    userEmail: string;
    content: string;
    createdAt: string;
  }[];
}

interface TaskState {
  tasks: Task[];
  categories: string[];
  tags: string[];
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  addComment: (taskId: string, content: string) => Promise<void>;
  addCollaborator: (taskId: string, userEmail: string, role: 'viewer' | 'editor') => Promise<void>;
  removeCollaborator: (taskId: string, collaboratorId: string) => Promise<void>;
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

  addTask: async (task) => {
    const newTask = { 
      ...task, 
      id: crypto.randomUUID(),
      collaborators: [],
      comments: []
    };
    
    try {
      set((state) => ({ tasks: [...state.tasks, newTask] }));
      await get().syncWithDrive();
      socketService.updateTask(newTask);

      // Update cache
      taskCache.setTasks(get().tasks);

      useNotificationStore.getState().addNotification({
        type: 'success',
        message: 'Task added successfully'
      });
    } catch (error) {
      console.error('Error adding task:', error);
      set((state) => ({
        tasks: state.tasks.filter(t => t.id !== newTask.id)
      }));
      
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to add task'
      });
    }
  },

  toggleTask: async (id) => {
    try {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, completed: !task.completed } : task
        ),
      }));
      
      // Update cache
      taskCache.setTasks(get().tasks);
      
      await get().syncWithDrive();
      const task = get().tasks.find(t => t.id === id);
      if (task) {
        socketService.updateTask(task);
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      set((state) => ({
        tasks: state.tasks.map(task =>
          task.id === id ? { ...task, completed: !task.completed } : task
        )
      }));
      
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to update task status'
      });
    }
  },

  deleteTask: async (id) => {
    const deletedTask = get().tasks.find(t => t.id === id);
    
    try {
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id)
      }));
      taskCache.setTasks(get().tasks);
      await get().syncWithDrive();
    } catch (error) {
      console.error('Error deleting task:', error);
      if (deletedTask) {
        set((state) => ({
          tasks: [...state.tasks, deletedTask]
        }));
      }
      
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to delete task'
      });
    }
  },

  updateTask: async (id, updatedFields) => {
    const oldTask = get().tasks.find(t => t.id === id);
    
    try {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, ...updatedFields } : task
        ),
      }));
      
      taskCache.setTasks(get().tasks);
      await get().syncWithDrive();
      const task = get().tasks.find(t => t.id === id);
      if (task) {
        socketService.updateTask(task);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      if (oldTask) {
        set((state) => ({
          tasks: state.tasks.map(t => t.id === id ? oldTask : t)
        }));
      }
      
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to update task'
      });
    }
  },

  addComment: async (taskId: string, content: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const comment = {
      id: crypto.randomUUID(),
      userId: user.id,
      userEmail: user.email,
      content,
      createdAt: new Date().toISOString()
    };

    try {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? { ...task, comments: [...(task.comments || []), comment] }
            : task
        ),
      }));
      taskCache.setTasks(get().tasks);
      await get().syncWithDrive();
    } catch (error) {
      console.error('Error adding comment:', error);
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to add comment'
      });
    }
  },

  addCollaborator: async (taskId: string, userEmail: string, role: 'viewer' | 'editor') => {
    const collaborator = {
      id: crypto.randomUUID(),
      userId: crypto.randomUUID(), // In a real app, you'd get this from the user's account
      userEmail,
      role,
      createdAt: new Date().toISOString()
    };

    try {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? { ...task, collaborators: [...(task.collaborators || []), collaborator] }
            : task
        ),
      }));
      taskCache.setTasks(get().tasks);
      await get().syncWithDrive();
    } catch (error) {
      console.error('Error adding collaborator:', error);
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to add collaborator'
      });
    }
  },

  removeCollaborator: async (taskId: string, collaboratorId: string) => {
    try {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                collaborators: (task.collaborators || []).filter(
                  (c) => c.id !== collaboratorId
                ),
              }
            : task
        ),
      }));
      taskCache.setTasks(get().tasks);
      await get().syncWithDrive();
    } catch (error) {
      console.error('Error removing collaborator:', error);
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to remove collaborator'
      });
    }
  },

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

    try {
      const tasks = get().tasks;
      await googleDrive.saveTasks(tasks);
      taskCache.setTasks(tasks); // Update cache after successful sync
    } catch (error) {
      console.error('Error syncing with Drive:', error);
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to sync with Google Drive'
      });
      throw error;
    }
  },

  uploadAttachment: async (taskId: string, file: File) => {
    const googleDrive = useAuthStore.getState().googleDrive;
    if (!googleDrive) return;

    try {
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
        taskCache.setTasks(get().tasks);
        await get().syncWithDrive();
      }
    } catch (error) {
      console.error('Error uploading attachment:', error);
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to upload file'
      });
    }
  },

  deleteAttachment: async (taskId: string, attachmentId: string) => {
    const googleDrive = useAuthStore.getState().googleDrive;
    if (!googleDrive) return;

    try {
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
        taskCache.setTasks(get().tasks);
        await get().syncWithDrive();
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to delete attachment'
      });
    }
  },
}));