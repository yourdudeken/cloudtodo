export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  reminder?: string;
  tags: string[];
  category?: string;
  isRecurring?: boolean;
  recurringPattern?: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval: number;
    customPattern?: string;
  };
  isStarred?: boolean;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  startTime?: string;
  predictedDuration?: number;
  actualDuration?: number;
  subtasks: SubTask[];
  attachments: Attachment[];
  comments: Comment[];
  assignedTo?: string[];
  theme?: 'light' | 'dark' | 'system';
  notifications?: NotificationPreference[];
  view?: 'list' | 'kanban' | 'calendar';
  integrations?: Integration[];
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  uploadedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  userName: string;
  attachments?: Attachment[];
}

export interface NotificationPreference {
  id: string;
  type: 'due' | 'reminder' | 'location' | 'habit';
  time?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  habitTrigger?: string;
  enabled: boolean;
}

export interface Integration {
  id: string;
  type: 'google-calendar' | 'slack' | 'notion';
  enabled: boolean;
  config: Record<string, any>;
}