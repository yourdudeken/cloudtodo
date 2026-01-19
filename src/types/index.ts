export type PriorityLevel = 1 | 2 | 3; // 1: High, 2: Medium, 3: Low

export interface TaskType {
    isPersonal: boolean;
    isCollaborative: boolean;
}

export interface Attachments {
    audio: string[];
    images: string[];
    documents: string[];
    videos: string[];
}

export interface Comment {
    id: string;
    userId: string;
    userEmail: string;
    content: string;
    createdAt: string;
}

export interface Task {
    id: string;
    taskTitle: string;
    description: string;
    dueDate: string;
    dueTime: string;
    reminder: number;
    priority: PriorityLevel;
    taskType: TaskType;
    isStarred: boolean;
    isPinned: boolean;
    categories: string[];
    tags: string[];
    recurrence: string;
    status: 'todo' | 'in-progress' | 'completed';
    attachments: Attachments;
    comments: Comment[];
    createdDate: string;
    updatedDate: string;
    googleDriveFileId?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    picture: string;
    accessToken: string;
}

export interface GoogleTokenResponse {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token?: string;
}
