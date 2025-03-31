import { create } from 'zustand';
import { useAuthStore } from './auth';
import { socketService } from '@/lib/socket';
import { FileAttachment, TaskComment } from '@/lib/google-drive'; // Import TaskComment
import { useNotificationStore } from './notifications';
import { taskCache } from '@/lib/cache';
import { 
  scheduleTaskNotification, 
  cancelTaskNotification, 
  rescheduleTaskNotification 
} from '@/lib/browser-notifications'; // Import notification scheduling functions

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
  comments?: TaskComment[]; // Use TaskComment type if defined elsewhere, or keep inline structure
  taskType: 'personal' | 'collaborative'; // Added task type
  createdAt: number; // Added creation timestamp (Unix milliseconds)
  // userId?: string; // Removed userId field as it's not used for notifications anymore
}

interface TaskState {
  tasks: Task[];
  categories: string[];
  tags: string[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>; // Omit createdAt as well
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

  // addTask now only sends data to the server. The 'taskAdded' socket listener handles adding to state.
  addTask: async (taskData) => {
    // Prepare data to send (without client-generated ID or createdAt)
    const dataToSend = {
      ...taskData,
      // Ensure required fields have defaults if not provided by the form/caller
      completed: taskData.completed ?? false,
      priority: taskData.priority ?? 4,
      projectId: taskData.projectId || 'inbox', // Ensure projectId exists
      // Server will add id, createdAt, collaborators, comments, attachments etc.
    };

    try {
      // Emit event to server with the core task data
      console.log('[store/addTask] Emitting addTask event with data:', dataToSend);
      socketService.addTask(dataToSend);

      // Notification can remain, or be triggered by the 'taskAdded' listener later
      useNotificationStore.getState().addNotification({
        type: 'info', // Changed to info as success is confirmed by server event
        message: 'Adding task...'
      });
    } catch (error) { // Catch potential synchronous errors in socketService.addTask if any
      console.error('Error emitting addTask event:', error);
      // No state to revert as optimistic update was removed
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to add task'
       });
       // Schedule notification after successful add (or rely on socket listener)
       // Note: Scheduling might be better handled in the 'taskAdded' socket listener 
       // after the task with its final ID and details is added to the store.
       // If scheduling here, ensure the taskData includes enough info (dueDate, reminder).
       // scheduleTaskNotification({ id: /* Need ID from server */, ...dataToSend }); 
     }
   },

   toggleTask: async (id) => {
     const originalTasks = get().tasks;
     const task = originalTasks.find(t => t.id === id);
    if (!task) return;

    const updatedTask = { ...task, completed: !task.completed };

    try {
      // Optimistic update
      set({ tasks: originalTasks.map(t => t.id === id ? updatedTask : t) });
      taskCache.setTasks(get().tasks);

       // Emit update to server
       socketService.updateTask(updatedTask);

       // Reschedule notification based on new completion status
       rescheduleTaskNotification(updatedTask);

     } catch (error) { // This catch might not be effective for socket errors
       console.error('Error toggling task status via socket:', error);
      // Revert optimistic update
      set({ tasks: originalTasks });
      taskCache.setTasks(originalTasks);

      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to update task status'
      });
    }
  },

  deleteTask: async (id) => {
    const originalTasks = get().tasks;
    const taskToDelete = originalTasks.find(t => t.id === id);
    if (!taskToDelete) return;

    try {
      // Optimistic update (remove immediately from UI)
      // Note: The socket listener for 'taskDeleted' will also perform this removal.
      // Depending on desired UX, you might remove this optimistic update and rely solely on the listener.
      set({ tasks: originalTasks.filter(task => task.id !== id) });
      taskCache.setTasks(get().tasks);

       // Emit delete event to server
       socketService.deleteTask(id);

       // Cancel any scheduled notification for the deleted task
       cancelTaskNotification(id);

       // No need to call syncWithDrive here
       useNotificationStore.getState().addNotification({
        type: 'success', // Or remove notification if handled by listener
        message: 'Task deleted'
      });

    } catch (error) { // This catch might not be effective for socket errors
      console.error('Error deleting task via socket:', error);
      // Revert optimistic update if needed (though listener might handle it)
      set({ tasks: originalTasks });
      taskCache.setTasks(originalTasks);

      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to delete task'
      });
    }
  },

  updateTask: async (id, updatedFields) => {
    const originalTasks = get().tasks;
    const taskToUpdate = originalTasks.find(t => t.id === id);
    if (!taskToUpdate) return;

    const updatedTask = { ...taskToUpdate, ...updatedFields };

    try {
      // Optimistic update
      set({ tasks: originalTasks.map(t => t.id === id ? updatedTask : t) });
      taskCache.setTasks(get().tasks);

       // Emit update to server
       socketService.updateTask(updatedTask);

       // Reschedule notification based on updated details
       rescheduleTaskNotification(updatedTask);

     } catch (error) { // This catch might not be effective for socket errors
       console.error('Error updating task via socket:', error);
      // Revert optimistic update
      set({ tasks: originalTasks });
      taskCache.setTasks(originalTasks);

      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to update task'
      });
    }
  },

  // addComment now updates the task locally and emits an updateTask event
  addComment: async (taskId: string, content: string) => {
    const user = useAuthStore.getState().user;
    // Require login to comment for now
    if (!user) {
       console.error("Cannot add comment: User not logged in.");
       useNotificationStore.getState().addNotification({ type: 'error', message: 'You must be logged in to comment.' });
       return;
    }

    const originalTasks = get().tasks;
    const taskToUpdate = originalTasks.find(t => t.id === taskId);
    if (!taskToUpdate) {
      console.error("Cannot add comment: Task not found.");
      useNotificationStore.getState().addNotification({ type: 'error', message: 'Task not found.' });
      return;
    }

    // Ensure TaskComment type includes necessary fields or adjust as needed
    const newComment: TaskComment = {
      id: crypto.randomUUID(),
      content,
      createdAt: new Date().toISOString(),
      userId: user.id, // Assuming user object has an id
      userEmail: user.email // Assuming user object has an email
    };

    const updatedTask = {
      ...taskToUpdate,
      comments: [...(taskToUpdate.comments || []), newComment] // Add new comment to array
    };

    try {
      // Optimistic update
      set({ tasks: originalTasks.map(t => t.id === taskId ? updatedTask : t) });
      taskCache.setTasks(get().tasks);

      // Emit updateTask event to server with the full updated task
      socketService.updateTask(updatedTask);

      useNotificationStore.getState().addNotification({ type: 'success', message: 'Comment added' });

    } catch (error) { // Catch potential synchronous errors
      console.error('Error adding comment via socket:', error);
      // Revert optimistic update
      set({ tasks: originalTasks });
      taskCache.setTasks(originalTasks);
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to add comment'
      });
    }
  },

  // Collaborator/Attachment changes also need to emit task updates
  addCollaborator: async (taskId: string, userEmail: string, role: 'viewer' | 'editor') => {
    const originalTasks = get().tasks;
    const taskToUpdate = originalTasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    const collaborator = {
      id: crypto.randomUUID(),
      userId: crypto.randomUUID(), // Placeholder ID
      userEmail,
      role,
      createdAt: new Date().toISOString()
    };
    const updatedTask = {
      ...taskToUpdate,
      collaborators: [...(taskToUpdate.collaborators || []), collaborator]
    };

    try {
      // Optimistic update
      set({ tasks: originalTasks.map(t => t.id === taskId ? updatedTask : t) });
      taskCache.setTasks(get().tasks);

      // Emit update to server
      socketService.updateTask(updatedTask);

    } catch (error) { // This catch might not be effective for socket errors
      console.error('Error adding collaborator via socket:', error);
      // Revert optimistic update
      set({ tasks: originalTasks });
      taskCache.setTasks(originalTasks);

      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to add collaborator'
      });
    }
  },

  removeCollaborator: async (taskId: string, collaboratorId: string) => {
    const originalTasks = get().tasks;
    const taskToUpdate = originalTasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

     const updatedTask = {
       ...taskToUpdate,
       collaborators: (taskToUpdate.collaborators || []).filter(c => c.id !== collaboratorId)
     };

    try {
      // Optimistic update
      set({ tasks: originalTasks.map(t => t.id === taskId ? updatedTask : t) });
      taskCache.setTasks(get().tasks);

      // Emit update to server
      socketService.updateTask(updatedTask);

    } catch (error) { // This catch might not be effective for socket errors
      console.error('Error removing collaborator via socket:', error);
      // Revert optimistic update
      set({ tasks: originalTasks });
      taskCache.setTasks(originalTasks);

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

  // syncWithDrive is no longer needed as primary mechanism
  syncWithDrive: async () => {
     console.warn("syncWithDrive called, but task synchronization is now handled by Socket.IO events.");
     // Optionally, could perform a manual fetch/sync if needed for recovery,
     // but primary updates should go through socketService.
     // Example: Trigger initial sync on demand?
     // const auth = useAuthStore.getState();
     // if (auth.isAuthenticated && auth.user && auth.accessToken) {
     //   socketService.initialize(); // Re-emit authenticate to trigger sync
     // }
  },

  uploadAttachment: async (taskId: string, file: File) => {
    const googleDrive = useAuthStore.getState().googleDrive; // Still need drive service for file ops
    if (!googleDrive) return;

    const originalTasks = get().tasks;
    const taskToUpdate = originalTasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    try {
      const attachment = await googleDrive.uploadFile(file, taskId); // Direct Drive API call for file
      if (attachment) {
        const updatedTask = {
          ...taskToUpdate,
          attachments: [...(taskToUpdate.attachments || []), attachment]
        };

        // Optimistic update
        set({ tasks: originalTasks.map(t => t.id === taskId ? updatedTask : t) });
        taskCache.setTasks(get().tasks);

        // Emit task update to server
        socketService.updateTask(updatedTask);
      } else {
         throw new Error("File upload failed in Google Drive service.");
      }
    } catch (error) {
      console.error('Error uploading attachment:', error);
       // No state reversal needed here as the file upload itself failed before state change
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to upload file'
      });
    }
  },

  deleteAttachment: async (taskId: string, attachmentId: string) => {
    const googleDrive = useAuthStore.getState().googleDrive; // Still need drive service for file ops
    if (!googleDrive) return;

    const originalTasks = get().tasks;
    const taskToUpdate = originalTasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    try {
      const success = await googleDrive.deleteFile(attachmentId); // Direct Drive API call for file
      if (success) {
         const updatedTask = {
           ...taskToUpdate,
           attachments: (taskToUpdate.attachments || []).filter(a => a.id !== attachmentId)
         };

        // Optimistic update
        set({ tasks: originalTasks.map(t => t.id === taskId ? updatedTask : t) });
        taskCache.setTasks(get().tasks);

        // Emit task update to server
        socketService.updateTask(updatedTask);
      } else {
         throw new Error("File deletion failed in Google Drive service.");
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
       // No state reversal needed here as the file deletion itself failed before state change
      useNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Failed to delete attachment'
      });
    }
  },
}));
