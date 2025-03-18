import CryptoJS from 'crypto-js';

const TASK_FILE_NAME = 'todo-tasks.json';
const ENCRYPTION_KEY = 'your-secret-key'; // In production, use environment variable

export class GoogleDriveService {
  constructor(config) {
    this.accessToken = config.accessToken;
    this.clientId = config.clientId;
  }

  async findOrCreateTaskFile() {
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

  async createTaskFile() {
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

  encrypt(data) {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  }

  decrypt(data) {
    const bytes = CryptoJS.AES.decrypt(data, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  async saveTasks(tasks) {
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

  async loadTasks() {
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