import CryptoJS from 'crypto-js';
import mime from 'mime-types';

const TASK_FILE_NAME = 'todo-tasks.json';
const ENCRYPTION_KEY = 'your-secret-key'; // In production, use environment variable

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

export class GoogleDriveService {
  private accessToken: string;
  private clientId: string;

  constructor(config: GoogleDriveConfig) {
    this.accessToken = config.accessToken;
    this.clientId = config.clientId;
  }

  private async findOrCreateTaskFile(): Promise<string | null> {
    try {
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?q=name="' +
          TASK_FILE_NAME +
          '"',
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      const data = await response.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }

      return this.createTaskFile();
    } catch (error) {
      console.error('Error finding task file:', error);
      return null;
    }
  }

  private async createTaskFile(): Promise<string | null> {
    try {
      const metadata = {
        name: TASK_FILE_NAME,
        mimeType: 'application/json',
      };

      const form = new FormData();
      form.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      );
      form.append('file', new Blob(['[]'], { type: 'application/json' }));

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: form,
        }
      );

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('Error creating task file:', error);
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

  async uploadFile(file: File, taskId: string): Promise<FileAttachment | null> {
    try {
      const metadata = {
        name: file.name,
        mimeType: file.type || mime.lookup(file.name) || 'application/octet-stream',
        description: `Attachment for task: ${taskId}`,
        properties: {
          taskId: taskId,
        },
      };

      const form = new FormData();
      form.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      );
      form.append('file', file);

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,thumbnailLink,webContentLink',
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
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  async saveTasks(tasks: any[]): Promise<boolean> {
    try {
      const fileId = await this.findOrCreateTaskFile();
      if (!fileId) return false;

      const encryptedData = this.encrypt(JSON.stringify(tasks));
      const metadata = {
        mimeType: 'application/json',
      };

      const form = new FormData();
      form.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      );
      form.append(
        'file',
        new Blob([encryptedData], { type: 'application/json' })
      );

      await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: form,
        }
      );

      return true;
    } catch (error) {
      console.error('Error saving tasks:', error);
      return false;
    }
  }

  async loadTasks(): Promise<any[]> {
    try {
      const fileId = await this.findOrCreateTaskFile();
      if (!fileId) return [];

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      const encryptedData = await response.text();
      const decryptedData = this.decrypt(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Error loading tasks:', error);
      return [];
    }
  }
}