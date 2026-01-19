import axios from 'axios';
import type { Task } from '@/types';
import { useAuthStore } from '@/store/authStore';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3';

const ROOT_FOLDER_NAME = 'CLOUDTASK';
const SUBFOLDERS = {
    AUDIOS: 'AUDIOS',
    VIDEOS: 'VIDEOS',
    DOCUMENTS: 'DOCUMENTS',
    PICTURES: 'PICTURES'
};

const getHeaders = (contentType: string = 'application/json', token?: string) => {
    const accessToken = token || useAuthStore.getState().user?.accessToken;
    if (!accessToken) throw new Error('Not authenticated');
    return {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': contentType,
    };
};

export const googleDriveService = {
    async ensureFolderStructure() {
        try {
            // 1. Check for root folder
            let rootFolderId = await this.findFolder(ROOT_FOLDER_NAME);

            if (!rootFolderId) {
                rootFolderId = await this.createFolder(ROOT_FOLDER_NAME);
            }

            // 2. Check for subfolders
            const folderIds: Record<string, string> = { ROOT: rootFolderId };

            for (const [key, name] of Object.entries(SUBFOLDERS)) {
                let folderId = await this.findFolder(name, rootFolderId);
                if (!folderId) {
                    folderId = await this.createFolder(name, rootFolderId);
                }
                folderIds[key] = folderId;
            }

            return folderIds;
        } catch (error) {
            console.error('Error ensuring folder structure:', error);
            throw error;
        }
    },

    async findFolder(name: string, parentId: string = 'root') {
        const query = `mimeType='application/vnd.google-apps.folder' and name='${name}' and '${parentId}' in parents and trash=false`;
        const response = await axios.get(`${DRIVE_API_URL}/files`, {
            params: { q: query, fields: 'files(id, name)' },
            headers: getHeaders()
        });
        return response.data.files?.[0]?.id || null;
    },

    async createFolder(name: string, parentId: string = 'root') {
        const metadata = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
        };

        const response = await axios.post(`${DRIVE_API_URL}/files`, metadata, {
            headers: getHeaders()
        });
        return response.data.id;
    },

    async listTasks(rootFolderId?: string) {
        if (!rootFolderId) {
            const folders = await this.ensureFolderStructure();
            rootFolderId = folders.ROOT;
        }

        const query = `'${rootFolderId}' in parents and mimeType='application/json' and trash=false`;
        const response = await axios.get(`${DRIVE_API_URL}/files`, {
            params: { q: query, fields: 'files(id, name, createdTime, modifiedTime)' },
            headers: getHeaders()
        });

        const tasks: Task[] = [];
        for (const file of response.data.files) {
            try {
                const content = await this.readFile(file.id);
                tasks.push({ ...content, id: file.id, googleDriveFileId: file.id });
            } catch (e) {
                console.error(`Failed to read task file ${file.id}`, e);
            }
        }
        return tasks;
    },

    async readFile(fileId: string) {
        const response = await axios.get(`${DRIVE_API_URL}/files/${fileId}`, {
            params: { alt: 'media' },
            headers: getHeaders()
        });
        return response.data;
    },

    async createTask(task: Omit<Task, 'id' | 'googleDriveFileId'>, rootFolderId?: string) {
        if (!rootFolderId) {
            const folders = await this.ensureFolderStructure();
            rootFolderId = folders.ROOT;
        }

        const metadata = {
            name: `task-${Date.now()}.json`,
            mimeType: 'application/json',
            parents: [rootFolderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(task)], { type: 'application/json' }));

        const response = await axios.post(`${UPLOAD_API_URL}/files?uploadType=multipart`, form, {
            headers: getHeaders('multipart/related') // axios will set boundary
        });

        return { ...task, id: response.data.id, googleDriveFileId: response.data.id };
    },

    async updateTask(task: Task) {
        if (!task.googleDriveFileId) throw new Error("Task has no Drive ID");

        const response = await axios.patch(`${UPLOAD_API_URL}/files/${task.googleDriveFileId}?uploadType=media`,
            JSON.stringify(task),
            { headers: getHeaders() }
        );
        return response.data;
    },

    async deleteTask(fileId: string) {
        await axios.delete(`${DRIVE_API_URL}/files/${fileId}`, {
            headers: getHeaders()
        });
    },

    async uploadAttachment(file: File, type: keyof typeof SUBFOLDERS) {
        const folders = await this.ensureFolderStructure();
        const parentId = folders[type];

        const metadata = {
            name: file.name,
            mimeType: file.type,
            parents: [parentId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const response = await axios.post(`${UPLOAD_API_URL}/files?uploadType=multipart&fields=id,webViewLink,webContentLink`, form, {
            headers: getHeaders('multipart/related')
        });

        return response.data;
    }
};
