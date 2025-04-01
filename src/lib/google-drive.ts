import axios, { AxiosError } from 'axios'; // Import AxiosError

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3'; // Keep for future use
export const ROOT_FOLDER_NAME = 'CLOUDTASK';
export const AUDIO_FOLDER_NAME = 'AUDIOS';
export const VIDEO_FOLDER_NAME = 'VIDEOS';
export const DOCUMENT_FOLDER_NAME = 'DOCUMENTS';
export const PICTURE_FOLDER_NAME = 'PICTURES';

/**
 * Generates a sanitized filename for a task.
 * @param taskTitle The title of the task.
 * @returns Sanitized filename ending with .json.
 */
export function generateFileName(taskTitle: string): string {
    // Remove special characters, replace spaces with nothing, convert to lowercase
    const sanitized = taskTitle
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove non-word characters except spaces and hyphens
        .replace(/\s+/g, '') // Replace spaces with nothing
        .replace(/-+/g, ''); // Replace hyphens with nothing
    return `${sanitized || 'untitled'}.json`; // Use 'untitled' if empty
}

/**
 * Creates headers for Google Drive API requests.
 * @param accessToken The user's OAuth 2.0 access token.
 * @param contentType The content type for the request.
 * @returns Authorization headers.
 */
const createHeaders = (accessToken: string, contentType: string = 'application/json') => ({
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': contentType,
});

/**
 * Finds a file or folder by name within a specific parent folder.
 * @param accessToken User's access token.
 * @param name Name of the file/folder to find.
 * @param parentFolderId ID of the parent folder ('root' for root directory).
 * @param mimeType Optional MIME type to filter by (e.g., 'application/vnd.google-apps.folder').
 * @returns The ID of the found item, or null if not found.
 */
const findItemByName = async (
    accessToken: string,
    name: string,
    parentFolderId: string,
    mimeType?: string
): Promise<string | null> => {
    console.log(`[findItemByName] Searching for '${name}' in parent '${parentFolderId}'${mimeType ? ` (MIME: ${mimeType})` : ''}`); // Log search details
    let query = `name='${name}' and '${parentFolderId}' in parents and trashed=false`;
    if (mimeType) {
        query += ` and mimeType='${mimeType}'`;
    }
    console.log(`[findItemByName] Query: ${query}`); // Log the query

    try {
        const response = await axios.get(`${DRIVE_API_URL}/files`, {
            headers: createHeaders(accessToken),
            params: {
                q: query,
                fields: 'files(id)',
                spaces: 'drive',
            },
        });

        if (response.data.files && response.data.files.length > 0) {
            const foundId = response.data.files[0].id;
            console.log(`[findItemByName] Found item '${name}' with ID: ${foundId}`); // Log success
            return foundId;
        }
        console.log(`[findItemByName] Item '${name}' not found.`); // Log not found
        return null;
    } catch (error: unknown) {
        console.error(`[findItemByName] Error finding item '${name}':`, error); // Log error
        // Handle potential 401/403 errors (token expired/invalid scopes)
        if (axios.isAxiosError(error as AxiosError) && ((error as AxiosError).response?.status === 401 || (error as AxiosError).response?.status === 403)) {
            // TODO: Implement token refresh or re-authentication logic
            console.error("Authentication error. Please re-login.");
        }
        return null; // Indicate failure or item not found
    }
};

/**
 * Creates a folder in Google Drive.
 * @param accessToken User's access token.
 * @param name Name of the folder to create.
 * @param parentFolderId ID of the parent folder ('root' for root directory).
 * @returns The ID of the created folder, or null on failure.
 */
const createFolder = async (
    accessToken: string,
    name: string,
    parentFolderId: string
): Promise<string | null> => {
    console.log(`[createFolder] Attempting to create folder '${name}' in parent '${parentFolderId}'`); // Log creation attempt
    const fileMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
    };

    try {
        const response = await axios.post(`${DRIVE_API_URL}/files`, fileMetadata, {
            headers: createHeaders(accessToken),
            params: {
                fields: 'id',
            },
        });
        console.log(`[createFolder] Folder '${name}' created successfully with ID: ${response.data.id}`); // Log success
        return response.data.id;
    } catch (error: unknown) {
        console.error(`[createFolder] Error creating folder '${name}':`, error); // Log error
         if (axios.isAxiosError(error as AxiosError) && ((error as AxiosError).response?.status === 401 || (error as AxiosError).response?.status === 403)) {
            console.error("Authentication error. Please re-login.");
        }
        return null;
    }
};

/**
 * Gets the ID of a folder, creating it if it doesn't exist.
 * @param accessToken User's access token.
 * @param folderName Name of the folder.
 * @param parentFolderId ID of the parent folder ('root' for root directory).
 * @returns The ID of the folder, or null on failure.
 */
export const getOrCreateFolder = async (
    accessToken: string,
    folderName: string,
    parentFolderId: string = 'root'
): Promise<string | null> => {
    console.log(`[getOrCreateFolder] Getting or creating folder '${folderName}' in parent '${parentFolderId}'`); // Log entry
    const existingFolderId = await findItemByName(
        accessToken,
        folderName,
        parentFolderId,
        'application/vnd.google-apps.folder'
    );

    if (existingFolderId) {
        console.log(`[getOrCreateFolder] Reusing existing folder '${folderName}' (ID: ${existingFolderId})`); // Log reuse
        return existingFolderId;
    } else {
        console.log(`[getOrCreateFolder] Folder '${folderName}' not found by findItemByName. Attempting creation...`); // Log creation path
        const newFolderId = await createFolder(accessToken, folderName, parentFolderId);
        if (newFolderId) {
             console.log(`[getOrCreateFolder] Successfully created new folder '${folderName}' (ID: ${newFolderId})`); // Log successful creation
        } else {
             console.error(`[getOrCreateFolder] Failed to create folder '${folderName}'`); // Log creation failure
        }
        return newFolderId;
    }
};

// --- Task Data Structure (Matching Feedback Format) ---
export interface TaskData {
    taskTitle: string;
    description?: string;
    dueDate?: string; // Format: "DD-MM-YYYY" as per example (consider ISO 8601 for robustness)
    dueTime?: string; // Format: "HH:mm" as per example
    reminder?: number; // Minutes before due time
    priority?: number; // e.g., 1 (High), 2 (Medium), 3 (Low)
    taskType?: { // Object structure
        isPersonal?: boolean;
        isCollaborative?: boolean;
    };
    isStarred?: boolean;
    isPinned?: boolean;
    categories?: string[]; // Array of strings
    tags?: string[]; // Array of strings
    recurrence?: string; // e.g., "None", "Daily", "Weekly"
    attachments: { // Specific structure with optional arrays of strings (Drive IDs/Links)
        audio?: string[];
        images?: string[];
        documents?: string[];
        videos?: string[];
    };
    // Add comments array
    comments?: {
        id: string;
        userId: string;
        userEmail: string;
        content: string;
        createdAt: string; // ISO 8601 format
    }[];
    // attachmentFolders is NOT included in the saved JSON as per feedback
    // --- Fields managed internally or added by functions ---
    id?: string; // Google Drive file ID (added during read/create)
    status?: string; // e.g., 'pending', 'in-progress', 'completed' (added during create/update)
    createdDate?: string; // ISO 8601 format (added during create)
    updatedDate?: string; // ISO 8601 format (added during create/update)
}


// --- CRUD Functions for Tasks (JSON files) ---
// Ensure these functions handle the TaskData structure correctly

/**
 * Creates a new task JSON file in Google Drive.
 * @param accessToken User's access token.
 * @param parentFolderId ID of the parent folder (CLOUDTASK folder).
 * @param taskData Data for the new task (matching the structure, excluding managed fields).
 * @returns The ID of the created file, or null on failure.
 */
export const createTask = async (
    accessToken: string,
    parentFolderId: string,
    // Ensure input type matches the required fields for creation based on TaskData
    taskData: Omit<TaskData, 'id' | 'createdDate' | 'updatedDate' | 'status'>
): Promise<string | null> => {
    const fileName = generateFileName(taskData.taskTitle);
    // Construct the full TaskData object to be saved, including defaults/managed fields
    const taskContent: TaskData = {
        ...taskData, // Spread the input data
        // Ensure required fields have defaults if not provided
        description: taskData.description || undefined,
        dueDate: taskData.dueDate || undefined,
        dueTime: taskData.dueTime || undefined,
        reminder: taskData.reminder || undefined,
        priority: taskData.priority || 3, // Default priority if needed
        taskType: taskData.taskType || { isPersonal: true }, // Default type
        isStarred: taskData.isStarred || false,
        isPinned: taskData.isPinned || false,
        categories: taskData.categories || [],
        tags: taskData.tags || [],
        recurrence: taskData.recurrence || "None",
        attachments: taskData.attachments || { audio: [], images: [], documents: [], videos: [] },
        comments: taskData.comments || [], // Initialize comments array
        // Add managed fields
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
        status: 'pending', // Default status
    };

    const fileMetadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [parentFolderId],
    };

    const media = {
        mimeType: 'application/json',
        body: JSON.stringify(taskContent, null, 2), // Pretty print JSON
    };

    // Use FormData for multipart upload
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
    form.append('file', new Blob([media.body], { type: media.mimeType }));

    try {
        const response = await axios.post(`${DRIVE_UPLOAD_API_URL}/files?uploadType=multipart`, form, {
            headers: {
                 Authorization: `Bearer ${accessToken}`,
                 // Content-Type is set automatically by axios for FormData
            },
            params: {
                fields: 'id', // Request the ID of the created file
            },
        });
        console.log(`Task '${taskData.taskTitle}' created with file ID: ${response.data.id}`);
        return response.data.id;
    } catch (error: unknown) {
        console.error(`Error creating task '${taskData.taskTitle}':`, error);
        if (axios.isAxiosError(error as AxiosError) && ((error as AxiosError).response?.status === 401 || (error as AxiosError).response?.status === 403)) {
            console.error("Authentication error. Please re-login.");
        }
        return null;
    }
};

/**
 * Lists all task JSON files within a specific folder.
 * @param accessToken User's access token.
 * @param parentFolderId ID of the folder containing the tasks (CLOUDTASK folder).
 * @returns An array of objects containing the id and name of each task file, or null on failure.
 */
export const listTasks = async (
    accessToken: string,
    parentFolderId: string
): Promise<{ id: string; name: string }[] | null> => {
    const query = `'${parentFolderId}' in parents and mimeType='application/json' and trashed=false`;

    try {
        const response = await axios.get(`${DRIVE_API_URL}/files`, {
            headers: createHeaders(accessToken),
            params: {
                q: query,
                fields: 'files(id, name)', // Get ID and name
                spaces: 'drive',
                orderBy: 'createdTime desc', // Optional: order by creation time
            },
        });

        if (response.data.files) {
            console.log(`Found ${response.data.files.length} tasks.`);
            return response.data.files as { id: string; name: string }[];
        }
        return []; // Return empty array if no files found
    } catch (error: unknown) {
        console.error('Error listing tasks:', error);
        if (axios.isAxiosError(error as AxiosError) && ((error as AxiosError).response?.status === 401 || (error as AxiosError).response?.status === 403)) {
            console.error("Authentication error. Please re-login.");
        }
        return null; // Indicate failure
    }
};

/**
 * Reads the content of a specific task JSON file.
 * @param accessToken User's access token.
 * @param fileId The Google Drive file ID of the task JSON file.
 * @returns The parsed TaskData object, or null on failure.
 */
export const readTask = async (
    accessToken: string,
    fileId: string
): Promise<TaskData | null> => {
    try {
        const response = await axios.get<TaskData>(`${DRIVE_API_URL}/files/${fileId}`, {
            headers: createHeaders(accessToken),
            params: {
                alt: 'media', // Download the file content
            },
        });

        // Add the file ID to the returned task data
        const taskData = { ...response.data, id: fileId };
        console.log(`Read task with ID: ${fileId}`);
        return taskData;
    } catch (error: unknown) {
        console.error(`Error reading task with ID ${fileId}:`, error);
        const axiosError = error as AxiosError; // Assert type once
        if (axios.isAxiosError(axiosError)) {
            if (axiosError.response?.status === 404) {
                console.error("Task file not found.");
            } else if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
                console.error("Authentication error. Please re-login.");
            }
        }
        return null; // Indicate failure
    }
};

/**
 * Updates the content of an existing task JSON file.
 * @param accessToken User's access token.
 * @param fileId The Google Drive file ID of the task to update.
 * @param updatedData The partial task data to update. 'updatedDate' will be set automatically.
 *                 Cannot update 'id' or 'createdDate'.
 * @returns The updated TaskData object (as returned by Drive potentially, or constructed), or null on failure.
 */
export const updateTask = async (
    accessToken: string,
    fileId: string,
    // Input should be partial data, excluding managed fields
    updatedData: Partial<Omit<TaskData, 'id' | 'createdDate' | 'updatedDate'>>
): Promise<TaskData | null> => {
    try {
        // Fetch the existing task to merge with updated fields
        const existingTask = await readTask(accessToken, fileId);
        if (!existingTask) {
             console.error(`Task with ID ${fileId} not found for update.`);
             return null;
        }

        // Merge existing data with updates and set the new updatedDate
        const taskContent: TaskData = {
            ...existingTask, // Start with existing data
            ...updatedData, // Overwrite with updated fields
            updatedDate: new Date().toISOString(), // Set new updated date
            // Ensure managed fields are not overwritten by updatedData
            id: existingTask.id,
            createdDate: existingTask.createdDate,
            status: updatedData.status ?? existingTask.status,
            // Ensure comments array is preserved if not part of the update
            comments: updatedData.comments !== undefined ? updatedData.comments : existingTask.comments,
        };

        const media = {
            mimeType: 'application/json',
            body: JSON.stringify(taskContent, null, 2),
        };

        // Use PATCH for updating content with uploadType=media
        const response = await axios.patch<TaskData>(`${DRIVE_UPLOAD_API_URL}/files/${fileId}?uploadType=media`, media.body, {
            headers: createHeaders(accessToken, media.mimeType),
            params: {
                // Request the updated file metadata if needed, e.g., 'id,name,modifiedTime'
                 fields: 'id, name, modifiedTime', // Example: get updated metadata
            },
        });

        console.log(`Updated task with ID: ${fileId}. Modified time: ${response.data.updatedDate}`); // Assuming modifiedTime is returned

        // Return the updated data structure (might need to re-read or construct)
        // For simplicity, returning the input data merged with new updatedDate and ID
        // A more robust approach might re-fetch the task using readTask after update.
        return {
            ...taskContent,
            id: fileId,
            // createdDate: existingTask?.createdDate // Keep original createdDate if merging
        } as TaskData; // Cast needed as we didn't fetch createdDate here

    } catch (error: unknown) {
        console.error(`Error updating task with ID ${fileId}:`, error);
        const axiosError = error as AxiosError;
        if (axios.isAxiosError(axiosError)) {
            if (axiosError.response?.status === 404) {
                console.error("Task file not found for update.");
            } else if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
                console.error("Authentication error. Please re-login.");
            }
        }
        return null; // Indicate failure
    }
};

/**
 * Deletes a task JSON file from Google Drive.
 * @param accessToken User's access token.
 * @param fileId The Google Drive file ID of the task to delete.
 * @returns True if deletion was successful, false otherwise.
 */
export const deleteTask = async (
    accessToken: string,
    fileId: string
): Promise<boolean> => {
    try {
        await axios.delete(`${DRIVE_API_URL}/files/${fileId}`, {
            headers: createHeaders(accessToken),
        });
        console.log(`Deleted task with ID: ${fileId}`);
        return true;
    } catch (error: unknown) {
        console.error(`Error deleting task with ID ${fileId}:`, error);
        const axiosError = error as AxiosError;
        if (axios.isAxiosError(axiosError)) {
            if (axiosError.response?.status === 404) {
                console.error("Task file not found for deletion.");
                // Consider returning true if not found, as the goal (task doesn't exist) is achieved
                return true;
            } else if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
                console.error("Authentication error. Please re-login.");
            }
        }
        return false; // Indicate failure
    }
};


// --- Functions for Attachments ---

/**
 * Ensures the standard attachment subfolders (AUDIOS, VIDEOS, etc.) exist within the parent folder.
 * @param accessToken User's access token.
 * @param parentFolderId ID of the main CLOUDTASK folder.
 */
export const ensureAttachmentFoldersExist = async (
    accessToken: string,
    parentFolderId: string
): Promise<void> => {
    const folderNames = [AUDIO_FOLDER_NAME, VIDEO_FOLDER_NAME, DOCUMENT_FOLDER_NAME, PICTURE_FOLDER_NAME];
    console.log(`Ensuring attachment folders exist in ${parentFolderId}...`);
    try {
        // Create them sequentially or in parallel
        await Promise.all(
            folderNames.map(folderName => getOrCreateFolder(accessToken, folderName, parentFolderId))
        );
        console.log("Attachment folders checked/created.");
    } catch (error) {
        console.error("Error ensuring attachment folders exist:", error);
        // Decide how to handle this - maybe notify the user?
    }
};

/**
 * Uploads a file attachment to a specific folder in Google Drive.
 * @param accessToken User's access token.
 * @param file The browser File object to upload.
 * @param targetFolderId The ID of the Google Drive folder to upload into.
 * @returns The ID of the uploaded file, or null on failure.
 */
export const uploadAttachment = async (
    accessToken: string,
    file: File,
    targetFolderId: string
): Promise<{ id: string; webViewLink: string } | null> => {
    console.log(`Uploading file '${file.name}' to folder ${targetFolderId}`);

    const fileMetadata = {
        name: file.name,
        parents: [targetFolderId],
    };

    // Use FormData for multipart upload
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
    form.append('file', file); // Pass the File object directly

    try {
        const response = await axios.post(`${DRIVE_UPLOAD_API_URL}/files?uploadType=multipart`, form, {
            headers: {
                 Authorization: `Bearer ${accessToken}`,
                 // Content-Type is set automatically by axios for FormData
            },
            params: {
                fields: 'id, webViewLink', // Request ID and view link
            },
        });
        console.log(`File '${file.name}' uploaded with ID: ${response.data.id}`);
        return response.data as { id: string; webViewLink: string };
    } catch (error: unknown) {
        console.error(`Error uploading file '${file.name}':`, error);
        if (axios.isAxiosError(error as AxiosError) && ((error as AxiosError).response?.status === 401 || (error as AxiosError).response?.status === 403)) {
            console.error("Authentication error during upload. Please re-login.");
        }
        return null;
    }
};


// TODO: Implement deleteAttachment (if needed) - would need file ID
