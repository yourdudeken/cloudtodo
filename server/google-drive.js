import { google } from 'googleapis';
import CryptoJS from 'crypto-js';

const TASKS_FOLDER_NAME = 'CloudTask';
const TASK_DATA_FILE = 'tasks.json';
// Remove module-level constant, key will be passed in constructor

export class GoogleDriveService {
  constructor(config) {
    // Store encryption key from config
    this.encryptionKey = config.encryptionKey;
    if (!this.encryptionKey) {
      console.error("GoogleDriveService: Encryption key was not provided in config!");
      throw new Error("Server configuration error: Missing Encryption Key for Drive Service.");
    }

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

  encrypt(data) {
    // Use instance property for the key
    if (!this.encryptionKey) throw new Error("Encryption key not set.");
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }

  decrypt(data) {
    // Log the key being used for decryption (using the instance property)
    console.log(`decrypt: Using encryptionKey: ${this.encryptionKey ? '****** (set)' : '!!! NOT SET !!!'}`); // Avoid logging the actual key value
    if (!this.encryptionKey) {
       console.error("decrypt: encryptionKey instance property is missing or undefined. Cannot decrypt.");
       throw new Error('Decryption failed: Missing Key');
    }
    try {
      // Use instance property for the key
      const bytes = CryptoJS.AES.decrypt(data, this.encryptionKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      // Add check for empty decrypted string which might indicate decryption failure with certain inputs/keys
      if (!decrypted && data) { // Check if original data existed but decryption yielded nothing
        console.error('Decryption resulted in empty string. Check ENCRYPTION_KEY or data integrity.');
        // Use a more specific error message
        throw new Error('Decryption failed: Empty Result');
      }
      console.log('Decryption successful.'); // Log success
      return decrypted;
    } catch (error) {
      // Log the specific error before re-throwing
      console.error(`Error during decryption process: ${error.message}`);
      // Add the original error type if possible
      if (error.name) console.error(`Decryption Error Type: ${error.name}`);
      // Re-throw a potentially more informative error if needed, or the original
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  async saveTasks(tasks) {
    console.log(`[saveTasks] Attempting to save ${tasks.length} tasks.`);
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

      console.log('[saveTasks] Encrypting data...');
      const encryptedData = this.encrypt(jsonData);
      console.log('[saveTasks] Encrypted data length:', encryptedData.length);
      // console.log(`[saveTasks] Encrypted data snippet: ${encryptedData.substring(0, 50)}...`); // Optional: log snippet

      console.log('[saveTasks] Calling drive.files.update...');
      const response = await this.drive.files.update({
        fileId: fileId,
        media: {
          mimeType: 'application/json', // Ensure this is correct
          body: encryptedData,
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

      const encryptedData = response.data;
      console.log('loadTasks: Attempting to decrypt data...');
      const decryptedData = this.decrypt(encryptedData); // Decryption logs added inside decrypt

      // Check if decryption actually returned something meaningful
       if (!decryptedData) {
         console.error('loadTasks: Decrypted data is empty or null. Cannot parse.');
         return []; // Return empty if decryption failed silently
       }

      console.log('loadTasks: Attempting to parse decrypted data...');
      const tasks = JSON.parse(decryptedData);
      console.log(`loadTasks: Successfully parsed ${tasks.length} tasks.`);
      return tasks;
    } catch (error) {
      console.error(`loadTasks: Error loading or processing tasks for fileId ${fileId}:`, error.message);
      // Log specific error types based on the re-thrown error message
      if (error instanceof SyntaxError) {
         console.error("loadTasks: JSON parsing failed. Decrypted data might be corrupted or not valid JSON.");
      } else if (error.message.startsWith('Decryption failed:')) {
         console.error(`loadTasks: ${error.message}. Check ENCRYPTION_KEY consistency or file corruption.`);
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
