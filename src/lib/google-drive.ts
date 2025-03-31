import CryptoJS from 'crypto-js';
import mime from 'mime-types';
import { taskCache } from './cache';

const TASKS_FOLDER_NAME = 'CloudTask';
const TASK_DATA_FILE = 'tasks.json';
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY

export interface GoogleDriveConfig {
  accessToken: string;
  clientId: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  thumbnailUrl?: string;
  downloadUrl: string;
}

export interface TaskComment {
  id: string;
  userId: string;
  userEmail: string;
  content: string;
  createdAt: string;
}

export interface TaskCollaborator {
  id: string;
  userId: string;
  userEmail: string;
  role: 'viewer' | 'editor';
  createdAt: string;
}

export class GoogleDriveService {
  private accessToken: string;
  private clientId: string;
  private tasksFolderId: string | null = null;
  private taskDataFileId: string | null = null;
  private lastSyncTimestamp: number = 0;
  private readonly SYNC_INTERVAL = 30000; // 30 seconds

  constructor(config: GoogleDriveConfig) {
    this.accessToken = config.accessToken;
    this.clientId = config.clientId;
  }

  private async findOrCreateTasksFolder(): Promise<string | null> {
    if (this.tasksFolderId) return this.tasksFolderId;

    try {
      // Search for existing folder
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${TASKS_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder'`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      const data = await response.json();
      
      if (data.files && data.files.length > 0) {
        this.tasksFolderId = data.files[0].id;
        return this.tasksFolderId;
      }

      // Create new folder
      const metadata = {
        name: TASKS_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      };

      const createResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metadata),
        }
      );

      const folder = await createResponse.json();
      this.tasksFolderId = folder.id;
      return this.tasksFolderId;
    } catch (error) {
      console.error('Error finding/creating tasks folder:', error);
      return null;
    }
  }

  private async findOrCreateTaskDataFile(): Promise<string | null> {
    if (this.taskDataFileId) return this.taskDataFileId;

    const folderId = await this.findOrCreateTasksFolder();
    if (!folderId) return null;

    try {
      // Search for existing file
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${TASK_DATA_FILE}' and '${folderId}' in parents`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      const data = await response.json();
      
      if (data.files && data.files.length > 0) {
        this.taskDataFileId = data.files[0].id;
        return this.taskDataFileId;
      }

      // Create new file
      const metadata = {
        name: TASK_DATA_FILE,
        parents: [folderId],
        mimeType: 'application/json',
      };

      const form = new FormData();
      form.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      );
      form.append('file', new Blob(['[]'], { type: 'application/json' }));

      const createResponse = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: form,
        }
      );

      const file = await createResponse.json();
      this.taskDataFileId = file.id;
      return this.taskDataFileId;
    } catch (error) {
      console.error('Error finding/creating task data file:', error);
      return null;
    }
  }

  private encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  }

  private decrypt(data: string): string {
    const bytes = CryptoJS.AES.decrypt(data, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  // Removed shouldSync as sync is now handled by socket events

  async uploadFile(file: File, taskId: string): Promise<FileAttachment | null> {
    const folderId = await this.findOrCreateTasksFolder();
    if (!folderId) return null;

    try {
      const metadata = {
        name: file.name,
        parents: [folderId],
        mimeType: file.type || mime.lookup(file.name) || 'application/octet-stream',
        appProperties: {
          taskId: taskId,
          uploadDate: new Date().toISOString(),
        },
      };

      const form = new FormData();
      form.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      );
      form.append('file', file);

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,thumbnailLink,webContentLink,appProperties',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: form,
        }
      );

      const data = await response.json();
      
      return {
        id: data.id,
        name: data.name,
        mimeType: data.mimeType,
        size: data.size,
        thumbnailUrl: data.thumbnailLink,
        downloadUrl: data.webContentLink,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );
      return response.ok;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  // Removed saveTasks - Task saving is now handled via socketService emitting events to the server
  // Removed loadTasks - Task loading/syncing is now handled via socketService listening to server events
}
