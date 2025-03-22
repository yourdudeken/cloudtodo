import { google } from 'googleapis';
import CryptoJS from 'crypto-js';

const TASKS_FOLDER_NAME = 'CloudTask';
const TASK_DATA_FILE = 'tasks.json';
const ENCRYPTION_KEY = process.env.VITE_ENCRYPTION_KEY || 'your-secret-key';

export class GoogleDriveService {
  constructor(config) {
    this.auth = new google.auth.OAuth2(config.clientId);
    this.auth.setCredentials({ access_token: config.accessToken });
    this.drive = google.drive({ version: 'v3', auth: this.auth });
    this.tasksFolderId = null;
    this.taskDataFileId = null;
  }

  async findOrCreateTasksFolder() {
    if (this.tasksFolderId) return this.tasksFolderId;

    try {
      // Search for existing folder
      const response = await this.drive.files.list({
        q: `name='${TASKS_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name)',
      });

      if (response.data.files.length > 0) {
        this.tasksFolderId = response.data.files[0].id;
        return this.tasksFolderId;
      }

      // Create new folder
      const folderMetadata = {
        name: TASKS_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      };

      const folder = await this.drive.files.create({
        resource: folderMetadata,
        fields: 'id',
      });

      this.tasksFolderId = folder.data.id;
      return this.tasksFolderId;
    } catch (error) {
      console.error('Error finding/creating tasks folder:', error);
      return null;
    }
  }

  async findOrCreateTaskDataFile() {
    if (this.taskDataFileId) return this.taskDataFileId;

    const folderId = await this.findOrCreateTasksFolder();
    if (!folderId) return null;

    try {
      // Search for existing file
      const response = await this.drive.files.list({
        q: `name='${TASK_DATA_FILE}' and '${folderId}' in parents`,
        fields: 'files(id, name)',
      });

      if (response.data.files.length > 0) {
        this.taskDataFileId = response.data.files[0].id;
        return this.taskDataFileId;
      }

      // Create new file
      const fileMetadata = {
        name: TASK_DATA_FILE,
        parents: [folderId],
      };

      const media = {
        mimeType: 'application/json',
        body: '[]',
      };

      const file = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
      });

      this.taskDataFileId = file.data.id;
      return this.taskDataFileId;
    } catch (error) {
      console.error('Error finding/creating task data file:', error);
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
    const fileId = await this.findOrCreateTaskDataFile();
    if (!fileId) return false;

    try {
      const encryptedData = this.encrypt(JSON.stringify(tasks));

      await this.drive.files.update({
        fileId: fileId,
        media: {
          mimeType: 'application/json',
          body: encryptedData,
        },
      });

      return true;
    } catch (error) {
      console.error('Error saving tasks:', error);
      return false;
    }
  }

  async loadTasks() {
    const fileId = await this.findOrCreateTaskDataFile();
    if (!fileId) return [];

    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });

      const encryptedData = response.data;
      const decryptedData = this.decrypt(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Error loading tasks:', error);
      return [];
    }
  }
}