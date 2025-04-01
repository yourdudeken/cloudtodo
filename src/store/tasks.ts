import { create } from 'zustand';
import { useAuthStore } from './auth';
import {
    createTask as driveCreateTask,
    listTasks as driveListTasks,
    readTask as driveReadTask,
    updateTask as driveUpdateTask,
    deleteTask as driveDeleteTask,
    uploadAttachment as driveUploadAttachment,
    // Import deleteFile function
    deleteFile as driveDeleteFile,
    getOrCreateFolder,
    ensureAttachmentFoldersExist,
    TaskData,
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
  scheduleNotificationsForTasks,
  clearAllScheduledNotifications,
} from '@/lib/browser-notifications';
import {
  scheduleDueTimeTrigger,
  cancelDueTimeTrigger,
  rescheduleDueTimeTrigger,
  scheduleDueTimeTriggersForTasks,
  clearAllDueTimeTriggers,
} from '@/lib/due-time-trigger';
import mime from 'mime-types';

export type Task = TaskData;

export interface UIAttachment {
    driveFileId: string;
    name: string;
    type: 'audio' | 'video' | 'document' | 'image' | 'other';
    webViewLink?: string;
}

// Define Comment type locally
interface Comment {
    id: string;
    userId: string;
    userEmail: string;
    content: string;
    createdAt: string;
}


const mapTaskDataAttachmentsToUI = (taskData: TaskData): UIAttachment[] => {
    const uiAttachments: UIAttachment[] = [];
    const addAttachments = (ids: string[] | undefined, type: UIAttachment['type'], task: TaskData) => {
        (ids || []).forEach(id => {
            // Placeholder name - ideally fetch real names
            const name = `Attachment (${type}) ${id.substring(0, 6)}`;
            // Placeholder link - ideally fetch real links
            const webViewLink = undefined;
            uiAttachments.push({ driveFileId: id, name, type, webViewLink });
        });
    };

    addAttachments(taskData.attachments?.audio, 'audio', taskData);
    addAttachments(taskData.attachments?.videos, 'video', taskData);
    addAttachments(taskData.attachments?.documents, 'document', taskData);
    addAttachments(taskData.attachments?.images, 'image', taskData);

    return uiAttachments;
};

const getAttachmentFolder = (fileType: string): string => {
    if (fileType.startsWith('audio/')) return AUDIO_FOLDER_NAME;
    if (fileType.startsWith('video/')) return VIDEO_FOLDER_NAME;
    if (fileType.startsWith('image/')) return PICTURE_FOLDER_NAME;
    return DOCUMENT_FOLDER_NAME;
};


interface TaskState {
  tasks: Task[];
  uiAttachments: { [taskId: string]: UIAttachment[] };
  categories: string[];
  tags: string[];
  cloudTaskFolderId: string | null;
  isLoading: boolean;
  initializeDrive: () => Promise<void>;
  addTask: (taskData: Omit<TaskData, 'id' | 'createdDate' | 'updatedDate' | 'status' | 'attachments' | 'comments'>) => Promise<string | null>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTask: (id: string, taskUpdateData: Partial<Omit<TaskData, 'id' | 'createdDate' | 'updatedDate'>>) => Promise<void>;
  addCategory: (category: string) => void;
  addTag: (tag: string) => void;
  addComment: (taskId: string, content: string) => Promise<void>;
  uploadAttachment: (taskId: string, file: File) => Promise<void>;
  deleteAttachment: (taskId: string, attachmentId: string) => Promise<void>; // Add deleteAttachment signature
  clearTasks: () => void;
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
    clearAllDueTimeTriggers();
    console.log('Task store cleared.');
  },

  initializeDrive: async () => {
    if (get().isLoading) {
        console.log('Drive initialization already in progress. Skipping.');
        return;
    }
    if (get().cloudTaskFolderId) {
        console.log('Drive already initialized (folder ID present).');
        return;
    }
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) {
      console.error('Cannot initialize Drive: No access token.');
      return;
    }

    set({ isLoading: true });
    console.log('Starting Drive initialization...');
    useNotificationStore.getState().addNotification({ type: 'info', message: 'Connecting to Google Drive...' });

    try {
      const folderId = await getOrCreateFolder(accessToken, ROOT_FOLDER_NAME, 'root');
      if (!folderId) {
        throw new Error(`Failed to get or create root folder '${ROOT_FOLDER_NAME}'.`);
      }
      set({ cloudTaskFolderId: folderId });
      console.log(`Root folder ID: ${folderId}`);

      await ensureAttachmentFoldersExist(accessToken, folderId);

      const taskFiles = await driveListTasks(accessToken, folderId);
      if (!taskFiles) {
        throw new Error('Failed to list tasks from Google Drive.');
      }

      const tasks: Task[] = [];
      const uiAttachmentsMap: { [taskId: string]: UIAttachment[] } = {};
      for (const file of taskFiles) {
        const taskData = await driveReadTask(accessToken, file.id);
        if (taskData) {
          if (!taskData.id) taskData.id = file.id;
          tasks.push(taskData);
          uiAttachmentsMap[taskData.id] = mapTaskDataAttachmentsToUI(taskData);
        } else {
          console.warn(`Failed to read task content for file ID: ${file.id}`);
        }
      }

      set({ tasks, uiAttachments: uiAttachmentsMap });
      taskCache.setTasks(tasks);
      scheduleNotificationsForTasks(tasks);
      scheduleDueTimeTriggersForTasks(tasks);
      useNotificationStore.getState().addNotification({ type: 'success', message: 'Tasks loaded from Google Drive.' });
      console.log(`Loaded ${tasks.length} tasks.`);

    } catch (error) {
      console.error('Error initializing Google Drive:', error);
      useNotificationStore.getState().addNotification({ type: 'error', message: `Drive Connection Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
        set({ isLoading: false });
        console.log('Drive initialization finished (success or error).');
    }
  },

  addTask: async (taskData) => {
    const { accessToken } = useAuthStore.getState();
    const { cloudTaskFolderId } = get();
    if (!accessToken || !cloudTaskFolderId) {
      useNotificationStore.getState().addNotification({ type: 'error', message: 'Cannot add task: Drive not initialized.' });
      return null;
    }

    const taskDataWithDefaults = {
        ...taskData,
        attachments: { audio: [], videos: [], documents: [], images: [] },
        comments: []
    };

    try {
      const newFileId = await driveCreateTask(accessToken, cloudTaskFolderId, taskDataWithDefaults);
      if (newFileId) {
        const newTask: Task = {
          ...taskDataWithDefaults,
          id: newFileId,
          createdDate: new Date().toISOString(),
          updatedDate: new Date().toISOString(),
          status: 'pending',
        };
        set((state) => ({
          tasks: [...state.tasks, newTask],
          uiAttachments: { ...state.uiAttachments, [newFileId]: [] }
        }));
        taskCache.setTasks(get().tasks);
        scheduleTaskNotification(newTask);
        scheduleDueTimeTrigger(newTask);
        useNotificationStore.getState().addNotification({ type: 'success', message: `Task "${newTask.taskTitle}" added.` });
        return newFileId;
      } else {
        throw new Error('Failed to create task file in Google Drive.');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      useNotificationStore.getState().addNotification({ type: 'error', message: 'Failed to add task.' });
      return null;
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
      const updatedTask = { ...task, ...updatePayload };
      set({ tasks: originalTasks.map(t => t.id === id ? updatedTask : t) });
      taskCache.setTasks(get().tasks);

      const driveUpdateResult = await driveUpdateTask(accessToken, id, updatePayload);
      if (!driveUpdateResult) {
          throw new Error('Google Drive update failed.');
      }

      set((state) => ({
          tasks: state.tasks.map(t => t.id === id ? { ...t, ...driveUpdateResult } : t)
      }));
      taskCache.setTasks(get().tasks);
      const finalUpdatedTask = get().tasks.find(t => t.id === id)!;
      rescheduleTaskNotification(finalUpdatedTask);
      rescheduleDueTimeTrigger(finalUpdatedTask);

    } catch (error) {
      console.error('Error toggling task status:', error);
      set({ tasks: originalTasks });
      taskCache.setTasks(originalTasks);
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
      set((state) => ({
          tasks: originalTasks.filter(task => task.id !== id),
          uiAttachments: Object.fromEntries(Object.entries(state.uiAttachments).filter(([taskId]) => taskId !== id))
      }));
      taskCache.setTasks(get().tasks);
      cancelTaskNotification(id);
      cancelDueTimeTrigger(id);

      const success = await driveDeleteTask(accessToken, id);
      if (!success) {
        console.warn(`Drive deletion failed or file not found for ID: ${id}. Assuming deleted.`);
      }
      useNotificationStore.getState().addNotification({ type: 'success', message: 'Task deleted.' });

    } catch (error) {
      console.error('Error deleting task:', error);
      set({ tasks: originalTasks, uiAttachments: get().uiAttachments });
      taskCache.setTasks(originalTasks);
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

    const optimisticUpdate = { ...taskToUpdate, ...updatedFields };

    try {
      set({ tasks: originalTasks.map(t => t.id === id ? optimisticUpdate : t) });
      taskCache.setTasks(get().tasks);

      const driveUpdateResult = await driveUpdateTask(accessToken, id, updatedFields);
      if (!driveUpdateResult) {
          throw new Error('Google Drive update failed.');
      }

      set((state) => ({
          tasks: state.tasks.map(t => t.id === id ? { ...t, ...driveUpdateResult } : t)
      }));
      taskCache.setTasks(get().tasks);
      const finalUpdatedTask = get().tasks.find(t => t.id === id)!;
      rescheduleTaskNotification(finalUpdatedTask);
      rescheduleDueTimeTrigger(finalUpdatedTask);

    } catch (error) {
      console.error('Error updating task:', error);
      set({ tasks: originalTasks });
      taskCache.setTasks(originalTasks);
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
    const driveUpdatePayload = { comments: updatedComments };

    try {
      set({ tasks: originalTasks.map(t => t.id === taskId ? optimisticUpdate : t) });
      taskCache.setTasks(get().tasks);

      const driveUpdateResult = await driveUpdateTask(accessToken, taskId, driveUpdatePayload);
      if (!driveUpdateResult) {
        throw new Error('Google Drive update failed when adding comment.');
      }

      set((state) => ({
        tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...driveUpdateResult } : t)
      }));
      taskCache.setTasks(get().tasks);
      useNotificationStore.getState().addNotification({ type: 'success', message: 'Comment added.' });

    } catch (error) {
      console.error('Error adding comment:', error);
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
    if (!taskToUpdate || !taskToUpdate.id) {
        useNotificationStore.getState().addNotification({ type: 'error', message: 'Cannot upload: Task not found.' });
        return;
    }

    const fileType = file.type || mime.lookup(file.name) || 'application/octet-stream';
    const attachmentFolderType = getAttachmentFolder(fileType);

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

        const attachmentFolderId = await getOrCreateFolder(accessToken, attachmentFolderName, cloudTaskFolderId);
        if (!attachmentFolderId) {
            throw new Error(`Failed to get or create attachment folder '${attachmentFolderName}'.`);
        }

        const uploadResult = await driveUploadAttachment(accessToken, file, attachmentFolderId);
        if (!uploadResult) {
            throw new Error('File upload to Google Drive failed.');
        }
        const { id: attachmentDriveId, webViewLink } = uploadResult;

        const attachmentKey = `${attachmentFolderType.toLowerCase()}s` as keyof TaskData['attachments'];
        const currentAttachments = taskToUpdate.attachments || { audio: [], images: [], documents: [], videos: [] };
        const updatedAttachmentList = [...(currentAttachments[attachmentKey] || []), attachmentDriveId];
        const taskUpdatePayload = {
            attachments: {
                ...currentAttachments,
                [attachmentKey]: updatedAttachmentList,
            }
        };

        const driveUpdateResult = await driveUpdateTask(accessToken, taskId, taskUpdatePayload);
        if (!driveUpdateResult) {
            console.error(`Failed to update task JSON for task ${taskId} after uploading attachment ${attachmentDriveId}. Attachment may be orphaned.`);
            throw new Error('Failed to update task metadata after upload.');
        }

        const newUIAttachment: UIAttachment = {
            driveFileId: attachmentDriveId,
            name: file.name,
            type: attachmentFolderType.toLowerCase() as UIAttachment['type'],
            webViewLink: webViewLink
        };

        set((state) => {
            const currentTaskIndex = state.tasks.findIndex(t => t.id === taskId);
            if (currentTaskIndex === -1) return {};

            const updatedTasks = [...state.tasks];
            updatedTasks[currentTaskIndex] = {
                ...updatedTasks[currentTaskIndex],
                ...driveUpdateResult
            };

            const updatedUIAttachmentsMap = { ...state.uiAttachments };
            updatedUIAttachmentsMap[taskId] = [...(updatedUIAttachmentsMap[taskId] || []), newUIAttachment];

            return {
                tasks: updatedTasks,
                uiAttachments: updatedUIAttachmentsMap
            };
        });
        taskCache.setTasks(get().tasks);

        useNotificationStore.getState().addNotification({ type: 'success', message: `Attachment "${file.name}" uploaded.` });

    } catch (error) {
      console.error('Error uploading attachment:', error);
      useNotificationStore.getState().addNotification({ type: 'error', message: `Failed to upload attachment: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },

  // Implement deleteAttachment logic
  deleteAttachment: async (taskId, attachmentId) => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) {
      useNotificationStore.getState().addNotification({ type: 'error', message: 'Authentication required.' });
      return;
    }
    if (!taskId || !attachmentId) {
        console.error("deleteAttachment: Missing taskId or attachmentId");
        return;
    }

    const originalTasks = get().tasks;
    const originalUiAttachments = get().uiAttachments;
    const taskToUpdate = originalTasks.find(t => t.id === taskId);
    const attachmentToDelete = originalUiAttachments[taskId]?.find(a => a.driveFileId === attachmentId);

    if (!taskToUpdate || !attachmentToDelete) {
      useNotificationStore.getState().addNotification({ type: 'error', message: 'Task or attachment not found.' });
      return;
    }

    // Optimistic UI Update
    set((state) => ({
        uiAttachments: {
            ...state.uiAttachments,
            [taskId]: state.uiAttachments[taskId]?.filter(a => a.driveFileId !== attachmentId) || []
        }
    }));

    try {
      // 1. Delete the file from Google Drive
      const deleteSuccess = await driveDeleteFile(accessToken, attachmentId);
      if (!deleteSuccess) {
        throw new Error('Failed to delete attachment file from Google Drive.');
      }
      console.log(`[deleteAttachment] Successfully deleted file ${attachmentId} from Drive.`);

      // 2. Update the task JSON to remove the attachment ID
      const updatedAttachments = { ...taskToUpdate.attachments };
      let found = false;
      // Iterate over attachment types (audio, images, etc.)
      for (const key in updatedAttachments) {
          const typedKey = key as keyof TaskData['attachments'];
          if (Array.isArray(updatedAttachments[typedKey])) {
              const index = updatedAttachments[typedKey]!.indexOf(attachmentId);
              if (index > -1) {
                  // Create a new array without the deleted ID
                  updatedAttachments[typedKey] = updatedAttachments[typedKey]!.filter(id => id !== attachmentId);
                  found = true;
                  break; // Assume ID is unique across types
              }
          }
      }

      if (!found) {
          console.warn(`[deleteAttachment] Attachment ID ${attachmentId} not found in task ${taskId} attachments object.`);
          useNotificationStore.getState().addNotification({ type: 'success', message: `Deleted attachment ${attachmentToDelete.name}.` });
          return; // Exit early if ID wasn't in the task JSON anyway
      }

      const taskUpdatePayload = { attachments: updatedAttachments };
      const driveUpdateResult = await driveUpdateTask(accessToken, taskId, taskUpdatePayload);

      if (!driveUpdateResult) {
        throw new Error('Failed to update task JSON after deleting attachment.');
      }

      // 3. Update local task state with confirmed data from Drive
      set((state) => ({
        tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...driveUpdateResult } : t)
        // uiAttachments already updated optimistically
      }));
      taskCache.setTasks(get().tasks); // Update cache
      useNotificationStore.getState().addNotification({ type: 'success', message: `Deleted attachment ${attachmentToDelete.name}.` });

    } catch (error) {
      console.error('Error deleting attachment:', error);
      // Revert optimistic UI update
      set({ tasks: originalTasks, uiAttachments: originalUiAttachments });
      taskCache.setTasks(originalTasks);
      useNotificationStore.getState().addNotification({ type: 'error', message: `Failed to delete attachment: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },
}));

// Automatically initialize Drive when user logs in
useAuthStore.subscribe(
  (state, prevState) => {
    if (state.isAuthenticated && !prevState.isAuthenticated) {
      console.log('Auth state changed to authenticated, initializing Drive...');
      setTimeout(() => {
        useTaskStore.getState().initializeDrive();
      }, 100);
    }
    else if (!state.isAuthenticated && prevState.isAuthenticated) {
      console.log('Auth state changed to logged out, clearing tasks...');
      useTaskStore.getState().clearTasks();
    }
  }
);
