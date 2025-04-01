import { create } from 'zustand';
import { useAuthStore } from './auth';
// Remove socketService import
// import { socketService } from '@/lib/socket';
import {
    // Import new Drive functions and types
    createTask as driveCreateTask,
    listTasks as driveListTasks,
    readTask as driveReadTask,
    updateTask as driveUpdateTask,
    deleteTask as driveDeleteTask,
    uploadAttachment as driveUploadAttachment,
    getOrCreateFolder,
    ensureAttachmentFoldersExist,
    TaskData, // Use the interface from google-drive
    ROOT_FOLDER_NAME,
    AUDIO_FOLDER_NAME,
    VIDEO_FOLDER_NAME,
    DOCUMENT_FOLDER_NAME,
    PICTURE_FOLDER_NAME,
} from '@/lib/google-drive';
import { useNotificationStore } from './notifications';
import { taskCache } from '@/lib/cache';
import {
  scheduleTaskNotification,
  cancelTaskNotification,
  rescheduleTaskNotification,
  scheduleNotificationsForTasks, // Keep for initial load
  clearAllScheduledNotifications, // Keep for logout/disconnect
} from '@/lib/browser-notifications';
// Import due time trigger functions
import {
  scheduleDueTimeTrigger,
  cancelDueTimeTrigger,
  rescheduleDueTimeTrigger,
  scheduleDueTimeTriggersForTasks,
  clearAllDueTimeTriggers,
} from '@/lib/due-time-trigger';
import mime from 'mime-types'; // Needed for determining attachment folder

// --- Align Task interface with TaskData ---
// Use TaskData as the base. The 'id' field in TaskData will store the Google Drive file ID.
export type Task = TaskData;

// Define a structure for attachments in the UI state, mapping to TaskData.attachments
// This helps bridge the gap between Drive IDs and usable attachment info.
export interface UIAttachment {
    driveFileId: string;
    name: string; // Store name for display
    type: 'audio' | 'video' | 'document' | 'image' | 'other';
    // Add other relevant UI fields like webViewLink if needed after upload/fetch
    webViewLink?: string;
}

// Helper to map TaskData attachments (string IDs) to UIAttachment[]
// This is a basic version; might need enhancement to fetch names/links later.
const mapTaskDataAttachmentsToUI = (taskData: TaskData): UIAttachment[] => {
    const uiAttachments: UIAttachment[] = [];
    const addAttachments = (ids: string[] | undefined, type: UIAttachment['type']) => {
        (ids || []).forEach(id => {
            // Placeholder name - ideally fetch real name or store it in TaskData
            uiAttachments.push({ driveFileId: id, name: `Attachment (${type})`, type });
        });
    };

    addAttachments(taskData.attachments?.audio, 'audio');
    addAttachments(taskData.attachments?.videos, 'video');
    addAttachments(taskData.attachments?.documents, 'document');
    addAttachments(taskData.attachments?.images, 'image');

    return uiAttachments;
};

// Helper to determine attachment folder based on file type
const getAttachmentFolder = (fileType: string): string => {
    if (fileType.startsWith('audio/')) return AUDIO_FOLDER_NAME;
    if (fileType.startsWith('video/')) return VIDEO_FOLDER_NAME;
    if (fileType.startsWith('image/')) return PICTURE_FOLDER_NAME;
    // Add more specific document types if needed
    return DOCUMENT_FOLDER_NAME; // Default for others
};


interface TaskState {
  tasks: Task[]; // Now uses the TaskData structure
  uiAttachments: { [taskId: string]: UIAttachment[] }; // Store UI-friendly attachments separately
  categories: string[];
  tags: string[];
  cloudTaskFolderId: string | null; // ID of the root CLOUDTASK folder
  isLoading: boolean; // Flag for loading state
  initializeDrive: () => Promise<void>; // Function to setup Drive and load tasks
  addTask: (taskData: Omit<TaskData, 'id' | 'createdDate' | 'updatedDate' | 'status' | 'attachments'>) => Promise<string | null>; // Return new task ID or null
  toggleTask: (id: string) => Promise<void>; // ID is now the Drive File ID
  deleteTask: (id: string) => Promise<void>; // ID is now the Drive File ID
  updateTask: (id: string, taskUpdateData: Partial<Omit<TaskData, 'id' | 'createdDate' | 'updatedDate'>>) => Promise<void>; // Adjusted input type
  addCategory: (category: string) => void;
  addTag: (tag: string) => void;
  addComment: (taskId: string, content: string) => Promise<void>; // Add back addComment
  uploadAttachment: (taskId: string, file: File) => Promise<void>; // ID is Drive File ID
  clearTasks: () => void; // Function to clear tasks on logout
}

// Define Comment type locally (matching TaskData.comments structure)
interface Comment {
    id: string;
    userId: string;
    userEmail: string;
    content: string;
    createdAt: string; // ISO 8601 format
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  uiAttachments: {},
  categories: ['Work', 'Personal', 'Shopping', 'Health', 'Education'],
  tags: ['Important', 'Urgent', 'In Progress', 'Blocked', 'Review'],
  cloudTaskFolderId: null,
  isLoading: false,

  clearTasks: () => {
    set({ tasks: [], uiAttachments: {}, cloudTaskFolderId: null, isLoading: false });
    taskCache.clear();
    clearAllScheduledNotifications();
    clearAllDueTimeTriggers(); // Also clear due time triggers
    console.log('Task store cleared.');
  },

  initializeDrive: async () => {
    // Prevent concurrent execution
    if (get().isLoading) {
        console.log('Drive initialization already in progress. Skipping.');
        return;
    }
    // Check for existing folder ID *after* checking isLoading
    if (get().cloudTaskFolderId) {
        console.log('Drive already initialized (folder ID present).');
        return;
    }
     // Check for access token *after* checking isLoading
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) {
      console.error('Cannot initialize Drive: No access token.');
      return;
    }

    // Set loading state immediately and synchronously
    set({ isLoading: true });
    console.log('Starting Drive initialization...'); // Add log
    useNotificationStore.getState().addNotification({ type: 'info', message: 'Connecting to Google Drive...' });

    try {
      // 1. Get or Create Root Folder
      const folderId = await getOrCreateFolder(accessToken, ROOT_FOLDER_NAME, 'root');
      if (!folderId) {
        throw new Error(`Failed to get or create root folder '${ROOT_FOLDER_NAME}'.`);
      }
      set({ cloudTaskFolderId: folderId });
      console.log(`Root folder ID: ${folderId}`);

      // 2. Ensure Attachment Subfolders Exist
      await ensureAttachmentFoldersExist(accessToken, folderId);

      // 3. List Task Files
      const taskFiles = await driveListTasks(accessToken, folderId);
      if (!taskFiles) {
        throw new Error('Failed to list tasks from Google Drive.');
      }

      // 4. Read each task file content
      const tasks: Task[] = [];
      const uiAttachmentsMap: { [taskId: string]: UIAttachment[] } = {};
      for (const file of taskFiles) {
        const taskData = await driveReadTask(accessToken, file.id);
        if (taskData) {
          // Ensure the task has an ID (which should be the file ID)
          if (!taskData.id) taskData.id = file.id;
          tasks.push(taskData);
          uiAttachmentsMap[taskData.id] = mapTaskDataAttachmentsToUI(taskData);
        } else {
          console.warn(`Failed to read task content for file ID: ${file.id}`);
        }
      }

      set({ tasks, uiAttachments: uiAttachmentsMap }); // isLoading is handled in finally
      taskCache.setTasks(tasks); // Update cache
      scheduleNotificationsForTasks(tasks); // Schedule browser REMINDERS
      scheduleDueTimeTriggersForTasks(tasks); // Schedule due time EMAIL TRIGGERS
      useNotificationStore.getState().addNotification({ type: 'success', message: 'Tasks loaded from Google Drive.' });
      console.log(`Loaded ${tasks.length} tasks.`);

    } catch (error) {
      console.error('Error initializing Google Drive:', error);
      set({ isLoading: false });
      useNotificationStore.getState().addNotification({ type: 'error', message: `Drive Connection Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
      // Optionally logout or clear state on critical init failure
      // useAuthStore.getState().logout();
    } finally {
        // Ensure isLoading is always reset
        set({ isLoading: false });
        console.log('Drive initialization finished (success or error).'); // Add log
    }
  },

  addTask: async (taskData) => {
    const { accessToken } = useAuthStore.getState();
    const { cloudTaskFolderId } = get();
    if (!accessToken || !cloudTaskFolderId) {
      useNotificationStore.getState().addNotification({ type: 'error', message: 'Cannot add task: Drive not initialized.' });
      return null; // Return null on failure
    }

    // Ensure attachments object exists even if empty
    const taskDataWithAttachments = {
        ...taskData,
        attachments: { audio: [], videos: [], documents: [], images: [] }
    };

    try {
      const newFileId = await driveCreateTask(accessToken, cloudTaskFolderId, taskDataWithAttachments);
      if (newFileId) {
        const newTask: Task = {
          ...taskDataWithAttachments,
          id: newFileId, // Add the Drive file ID
          createdDate: new Date().toISOString(),
          updatedDate: new Date().toISOString(),
          status: 'pending',
        };
        set((state) => ({
          tasks: [...state.tasks, newTask],
          uiAttachments: { ...state.uiAttachments, [newFileId]: [] } // Initialize empty UI attachments
        }));
        taskCache.setTasks(get().tasks);
        scheduleTaskNotification(newTask); // Schedule browser reminder
        scheduleDueTimeTrigger(newTask); // Schedule due time email trigger
        useNotificationStore.getState().addNotification({ type: 'success', message: `Task "${newTask.taskTitle}" added.` });
        return newFileId; // Return the new ID on success
      } else {
        throw new Error('Failed to create task file in Google Drive.');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      useNotificationStore.getState().addNotification({ type: 'error', message: 'Failed to add task.' });
      return null; // Return null on failure
    }
  },

  toggleTask: async (id) => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) return;

    const originalTasks = get().tasks;
    const task = originalTasks.find(t => t.id === id);
    if (!task) return;

    const updatedStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updatePayload = { status: updatedStatus };

    try {
      // Optimistic update
      const updatedTask = { ...task, ...updatePayload };
      set({ tasks: originalTasks.map(t => t.id === id ? updatedTask : t) });
      taskCache.setTasks(get().tasks);

      // Update in Drive
      const driveUpdateResult = await driveUpdateTask(accessToken, id, updatePayload);
      if (!driveUpdateResult) {
          throw new Error('Google Drive update failed.');
      }

      // Update state again with confirmed data from Drive (includes updatedDate)
      set((state) => ({
          tasks: state.tasks.map(t => t.id === id ? { ...t, ...driveUpdateResult } : t)
      }));
      taskCache.setTasks(get().tasks);
      const finalUpdatedTask = get().tasks.find(t => t.id === id)!;
      rescheduleTaskNotification(finalUpdatedTask); // Reschedule browser reminder
      rescheduleDueTimeTrigger(finalUpdatedTask); // Reschedule due time email trigger

    } catch (error) {
      console.error('Error toggling task status:', error);
      // Revert optimistic update
      set({ tasks: originalTasks });
      taskCache.setTasks(originalTasks);
      // Reschedule based on original state if update failed
      rescheduleTaskNotification(task);
      rescheduleDueTimeTrigger(task);
      useNotificationStore.getState().addNotification({ type: 'error', message: 'Failed to update task status.' });
    }
  },

  deleteTask: async (id) => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) return;

    const originalTasks = get().tasks;
    const taskToDelete = originalTasks.find(t => t.id === id);
    if (!taskToDelete) return;

    try {
      // Optimistic update
      set({
          tasks: originalTasks.filter(task => task.id !== id),
          uiAttachments: Object.fromEntries(Object.entries(get().uiAttachments).filter(([taskId]) => taskId !== id))
      });
      taskCache.setTasks(get().tasks);
      cancelTaskNotification(id); // Cancel browser reminder
      cancelDueTimeTrigger(id); // Cancel due time email trigger

      // Delete from Drive
      const success = await driveDeleteTask(accessToken, id);
      if (!success) {
        // Drive deletion failed (might already be deleted, which is okay)
        console.warn(`Drive deletion failed or file not found for ID: ${id}. Assuming deleted.`);
        // No need to revert optimistic UI update if file is gone
      }
      useNotificationStore.getState().addNotification({ type: 'success', message: 'Task deleted.' });

    } catch (error) {
      console.error('Error deleting task:', error);
      // Revert optimistic update only if Drive call truly failed (not just 404)
      set({ tasks: originalTasks, uiAttachments: get().uiAttachments }); // Revert fully might be complex, consider just logging
      taskCache.setTasks(originalTasks);
      // Reschedule based on original state if delete failed
      scheduleTaskNotification(taskToDelete);
      scheduleDueTimeTrigger(taskToDelete);
      useNotificationStore.getState().addNotification({ type: 'error', message: 'Failed to delete task.' });
    }
  },

  updateTask: async (id, updatedFields) => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) return;

    const originalTasks = get().tasks;
    const taskToUpdate = originalTasks.find(t => t.id === id);
    if (!taskToUpdate) return;

    // Exclude fields managed by Drive functions from optimistic update if necessary
    const optimisticUpdate = { ...taskToUpdate, ...updatedFields };

    try {
      // Optimistic update
      set({ tasks: originalTasks.map(t => t.id === id ? optimisticUpdate : t) });
      taskCache.setTasks(get().tasks);

      // Update in Drive
      const driveUpdateResult = await driveUpdateTask(accessToken, id, updatedFields);
      if (!driveUpdateResult) {
          throw new Error('Google Drive update failed.');
      }

      // Update state again with confirmed data from Drive
      set((state) => ({
          tasks: state.tasks.map(t => t.id === id ? { ...t, ...driveUpdateResult } : t)
      }));
      taskCache.setTasks(get().tasks);
      const finalUpdatedTask = get().tasks.find(t => t.id === id)!;
      rescheduleTaskNotification(finalUpdatedTask); // Reschedule browser reminder
      rescheduleDueTimeTrigger(finalUpdatedTask); // Reschedule due time email trigger

    } catch (error) {
      console.error('Error updating task:', error);
      // Revert optimistic update
      set({ tasks: originalTasks });
      taskCache.setTasks(originalTasks);
      // Reschedule based on original state if update failed
      rescheduleTaskNotification(taskToUpdate);
      rescheduleDueTimeTrigger(taskToUpdate);
      useNotificationStore.getState().addNotification({ type: 'error', message: 'Failed to update task.' });
    }
  },

  addComment: async (taskId, content) => {
    const { accessToken, user } = useAuthStore.getState();
    if (!accessToken || !user) {
      useNotificationStore.getState().addNotification({ type: 'error', message: 'You must be logged in to comment.' });
      return;
    }

    const originalTasks = get().tasks;
    const taskToUpdate = originalTasks.find(t => t.id === taskId);
    if (!taskToUpdate) {
      useNotificationStore.getState().addNotification({ type: 'error', message: 'Task not found.' });
      return;
    }

    const newComment: Comment = {
      id: crypto.randomUUID(),
      userId: user.id,
      userEmail: user.email,
      content: content,
      createdAt: new Date().toISOString(),
    };

    const updatedComments = [...(taskToUpdate.comments || []), newComment];
    const optimisticUpdate = { ...taskToUpdate, comments: updatedComments };
    const driveUpdatePayload = { comments: updatedComments }; // Only send comments in update

    try {
      // Optimistic update
      set({ tasks: originalTasks.map(t => t.id === taskId ? optimisticUpdate : t) });
      taskCache.setTasks(get().tasks); // Update cache if comments are cached

      // Update in Drive
      const driveUpdateResult = await driveUpdateTask(accessToken, taskId, driveUpdatePayload);
      if (!driveUpdateResult) {
        throw new Error('Google Drive update failed when adding comment.');
      }

      // Update state again with confirmed data from Drive (includes updatedDate)
      set((state) => ({
        tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...driveUpdateResult } : t)
      }));
      taskCache.setTasks(get().tasks); // Update cache again
      useNotificationStore.getState().addNotification({ type: 'success', message: 'Comment added.' });

    } catch (error) {
      console.error('Error adding comment:', error);
      // Revert optimistic update
      set({ tasks: originalTasks });
      taskCache.setTasks(originalTasks);
      useNotificationStore.getState().addNotification({ type: 'error', message: 'Failed to add comment.' });
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

  uploadAttachment: async (taskId, file) => {
    const { accessToken } = useAuthStore.getState();
    const { cloudTaskFolderId } = get();
    if (!accessToken || !cloudTaskFolderId) {
        useNotificationStore.getState().addNotification({ type: 'error', message: 'Cannot upload: Drive not initialized.' });
        return;
    }

    const originalTasks = get().tasks;
    const taskToUpdate = originalTasks.find(t => t.id === taskId);
    if (!taskToUpdate) {
        useNotificationStore.getState().addNotification({ type: 'error', message: 'Cannot upload: Task not found.' });
        return;
    }

    const fileType = file.type || mime.lookup(file.name) || 'application/octet-stream';
    const attachmentFolderType = getAttachmentFolder(fileType); // e.g., AUDIO_FOLDER_NAME

    // Map the type string to the actual folder name constant
    const folderNameMap: { [key: string]: string } = {
        [AUDIO_FOLDER_NAME]: AUDIO_FOLDER_NAME,
        [VIDEO_FOLDER_NAME]: VIDEO_FOLDER_NAME,
        [DOCUMENT_FOLDER_NAME]: DOCUMENT_FOLDER_NAME,
        [PICTURE_FOLDER_NAME]: PICTURE_FOLDER_NAME,
    };
    const attachmentFolderName = folderNameMap[attachmentFolderType];

    if (!attachmentFolderName) {
        console.error(`Invalid attachment folder type determined: ${attachmentFolderType}`);
        useNotificationStore.getState().addNotification({ type: 'error', message: 'Could not determine attachment category.' });
        return;
    }

    try {
        useNotificationStore.getState().addNotification({ type: 'info', message: `Uploading ${file.name}...` });

        // 1. Find/Create the specific attachment subfolder (e.g., AUDIOS)
        const attachmentFolderId = await getOrCreateFolder(accessToken, attachmentFolderName, cloudTaskFolderId);
        if (!attachmentFolderId) {
            throw new Error(`Failed to get or create attachment folder '${attachmentFolderName}'.`);
        }

        // 2. Upload the file to that subfolder
        const uploadResult = await driveUploadAttachment(accessToken, file, attachmentFolderId);
        if (!uploadResult) {
            throw new Error('File upload to Google Drive failed.');
        }
        const { id: attachmentDriveId, webViewLink } = uploadResult;

        // 3. Update the task JSON file in Drive to include the new attachment ID
        // Corrected: Use attachmentFolderType here
        const attachmentKey = `${attachmentFolderType.toLowerCase()}s` as keyof TaskData['attachments']; // e.g., 'audios', 'videos'
        const updatedAttachmentList = [...(taskToUpdate.attachments[attachmentKey] || []), attachmentDriveId];
        const taskUpdatePayload = {
            attachments: {
                ...taskToUpdate.attachments,
                [attachmentKey]: updatedAttachmentList,
            }
        };

        const driveUpdateResult = await driveUpdateTask(accessToken, taskId, taskUpdatePayload);
        if (!driveUpdateResult) {
            // Attempt to delete the orphaned attachment? Difficult to handle reliably. Log error.
            console.error(`Failed to update task JSON for task ${taskId} after uploading attachment ${attachmentDriveId}. Attachment may be orphaned.`);
            throw new Error('Failed to update task metadata after upload.');
        }

        // 4. Update local state (tasks and uiAttachments)
        const newUIAttachment: UIAttachment = {
            driveFileId: attachmentDriveId,
            name: file.name,
            // Corrected: Use attachmentFolderType here
            type: attachmentFolderType.toLowerCase() as UIAttachment['type'],
            webViewLink: webViewLink
        };

        set((state) => {
            const currentTask = state.tasks.find(t => t.id === taskId);
            if (!currentTask) return {}; // Should not happen

            const updatedTaskState = {
                ...currentTask,
                ...driveUpdateResult // Use confirmed data from Drive update
            };
            const updatedUIAttachments = [...(state.uiAttachments[taskId] || []), newUIAttachment];

            return {
                tasks: state.tasks.map(t => t.id === taskId ? updatedTaskState : t),
                uiAttachments: { ...state.uiAttachments, [taskId]: updatedUIAttachments }
            };
        });
        taskCache.setTasks(get().tasks); // Update cache

        useNotificationStore.getState().addNotification({ type: 'success', message: `Attachment "${file.name}" uploaded.` });

    } catch (error) {
      console.error('Error uploading attachment:', error);
      useNotificationStore.getState().addNotification({ type: 'error', message: `Failed to upload attachment: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },

  // deleteAttachment: async (taskId: string, attachmentId: string) => {
  //   // Implementation requires driveDeleteFile function and updating task JSON
  // },
}));

// Automatically initialize Drive when user logs in
// Need to subscribe to auth store changes
useAuthStore.subscribe(
  (state, prevState) => {
    // Check if authentication status changed to true
    if (state.isAuthenticated && !prevState.isAuthenticated) {
      console.log('Auth state changed to authenticated, initializing Drive...');
      // Use setTimeout to ensure access token is likely available after rehydration/callback
      setTimeout(() => {
        useTaskStore.getState().initializeDrive();
      }, 100); // Small delay
    }
    // Check if authentication status changed to false (logout)
    else if (!state.isAuthenticated && prevState.isAuthenticated) {
      console.log('Auth state changed to logged out, clearing tasks...');
      useTaskStore.getState().clearTasks();
    }
  }
);
