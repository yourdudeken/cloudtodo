import { google } from 'googleapis';
// Remove CryptoJS import
// import CryptoJS from 'crypto-js';

const TASKS_FOLDER_NAME = 'CloudTask';
const TASK_DATA_FILE = 'tasks.json';

export class GoogleDriveService {
  constructor(config) {
    // Remove encryption key handling
    // this.encryptionKey = config.encryptionKey;
    // if (!this.encryptionKey) {
    //   console.error("GoogleDriveService: Encryption key was not provided in config!");
    //   throw new Error("Server configuration error: Missing Encryption Key for Drive Service.");
    // }

    // Initialize OAuth2 client with credentials needed for refresh token flow
    this.auth = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri // Redirect URI is needed for OAuth2 client setup
    );
    // Set the refresh token. The library will handle fetching access tokens.
    this.auth.setCredentials({ refresh_token: config.refreshToken });

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

  // Remove encrypt method
  /*
  encrypt(data) {
    // ... implementation removed ...
  }
  */

  // Remove decrypt method
  /*
  decrypt(data) {
    // ... implementation removed ...
  }
  */

  async saveTasks(tasks) {
    console.log(`[saveTasks] Attempting to save ${tasks.length} tasks (unencrypted).`);
    const fileId = await this.findOrCreateTaskDataFile();
    if (!fileId) {
       console.error('[saveTasks] Failed: Could not get fileId.');
       return false;
    }
    console.log(`[saveTasks] Using fileId: ${fileId}`);

    try {
      // Log a snippet of the data being saved (e.g., just the IDs)
      const taskIds = tasks.map(t => t.id);
      console.log(`[saveTasks] Task IDs being saved: ${JSON.stringify(taskIds)}`);

      const jsonData = JSON.stringify(tasks);
      console.log('[saveTasks] Stringified JSON data length:', jsonData.length);

      // Remove encryption step
      // console.log('[saveTasks] Encrypting data...');
      // const encryptedData = this.encrypt(jsonData);
      // console.log('[saveTasks] Encrypted data length:', encryptedData.length);

      console.log('[saveTasks] Calling drive.files.update with plain JSON...');
      const response = await this.drive.files.update({
        fileId: fileId,
        media: {
          mimeType: 'application/json',
          body: jsonData, // Save plain JSON data
        },
      });

      // Log the response status from Google Drive API
      console.log(`[saveTasks] Google Drive API response status: ${response.status}`);
      if (response.status >= 200 && response.status < 300) {
         console.log('[saveTasks] Save successful according to API response.');
         return true;
      } else {
         console.error(`[saveTasks] Google Drive API returned non-success status: ${response.status}`, response.data);
         return false;
      }
    } catch (error) {
      console.error('[saveTasks] Error during save operation:', error);
      // Log specific Gaxios errors if possible
      if (error.response) {
         console.error(`[saveTasks] Google Drive API Error Response: Status ${error.response.status}`, error.response.data);
      }
      return false;
    }
  }

  async loadTasks() {
    const fileId = await this.findOrCreateTaskDataFile();
    if (!fileId) {
      console.log('loadTasks: No fileId found (folder/file creation might have failed), returning empty array.');
      return [];
    }

    try {
      console.log(`loadTasks: Attempting to get file content for fileId: ${fileId}`);
      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });

      // Check if response.data exists and has content
      if (!response.data || (typeof response.data === 'string' && response.data.length === 0)) {
         console.warn(`loadTasks: Received no data or empty string from Google Drive for fileId: ${fileId}. Assuming empty tasks file.`);
         // This might happen if the file is truly empty or newly created.
         return []; // Return empty array for empty file
      }

      console.log(`loadTasks: Received data of type: ${typeof response.data}`);
      // Avoid logging potentially large encrypted data unless necessary for debugging
      // console.log(`loadTasks: Raw data snippet: ${JSON.stringify(response.data).substring(0, 100)}...`);

      // Remove decryption step
      // const encryptedData = response.data;
      // console.log('loadTasks: Attempting to decrypt data...');
      // const decryptedData = this.decrypt(encryptedData);

      // Directly parse the response data
      const jsonData = response.data;

      // Check if decryption actually returned something meaningful (now check jsonData)
       if (!jsonData) {
         console.error('loadTasks: Received data is empty or null. Cannot parse.');
         return []; // Return empty if Drive returned nothing
       }

      console.log('loadTasks: Attempting to parse JSON data...');
      // Assuming response.data is already the parsed JSON object or needs parsing if it's a string
      let tasks;
      if (typeof jsonData === 'string') {
          tasks = JSON.parse(jsonData);
      } else if (typeof jsonData === 'object') {
          tasks = jsonData; // Assume googleapis library parsed it
      } else {
          console.error('loadTasks: Received data is not a string or object. Cannot parse.');
          return [];
      }

      console.log(`loadTasks: Successfully parsed ${tasks.length} tasks.`);
      return tasks;
    } catch (error) {
      console.error(`loadTasks: Error loading or processing tasks for fileId ${fileId}:`, error.message);
      // Log specific error types based on the re-thrown error message
      if (error instanceof SyntaxError) {
         console.error("loadTasks: JSON parsing failed. Data might be corrupted or not valid JSON.");
      // Remove decryption error check
      // } else if (error.message.startsWith('Decryption failed:')) {
      //    console.error(`loadTasks: ${error.message}. Check ENCRYPTION_KEY consistency or file corruption.`);
      } else if (error.response?.status === 404) { // Check if it's a GaxiosError first
         console.error(`loadTasks: File not found (404) for fileId ${fileId}. Maybe deleted externally?`);
      } else {
         // Log the full error for other cases
         console.error("loadTasks: Full error details:", error);
      }
      console.log('loadTasks: Returning empty array due to error.');
      return []; // Return empty array on any error during load/process
    }
  }
}
