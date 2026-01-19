import { Task } from '@/store/tasks'; // Task type from store
//import { TaskData } from '@/lib/google-drive'; // Import TaskData type from its source
import mime from 'mime-types'; // Import mime-types library

interface FileAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  thumbnailUrl?: string;
  downloadUrl: string;
}

class TaskCache {
  private static instance: TaskCache;
  private cache: Map<string, { tasks: Task[]; timestamp: number }>;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.cache = new Map();
    this.loadFromLocalStorage();

    // Save cache to localStorage before page unload
    window.addEventListener('beforeunload', () => {
      this.saveToLocalStorage();
    });
  }

  public static getInstance(): TaskCache {
    if (!TaskCache.instance) {
      TaskCache.instance = new TaskCache();
    }
    return TaskCache.instance;
  }

  private loadFromLocalStorage() {
    try {
      const savedCache = localStorage.getItem('taskCache');
      if (savedCache) {
        const { tasks: loadedTasks, timestamp } = JSON.parse(savedCache);

        // Check if cache is expired
        if (Date.now() - timestamp >= this.CACHE_DURATION) {
          console.log('Cache expired, removing from localStorage.');
          localStorage.removeItem('taskCache');
          return; // Don't load expired cache
        }

        // Validate/migrate loaded tasks to ensure attachments have necessary properties
        const validatedTasks = loadedTasks.map((task: any): Task => ({ // Use 'any' for flexibility, cast to Task
          ...task,
          // Ensure basic task properties have defaults if missing in old cache
          title: task.title || 'Untitled Task',
          completed: task.completed ?? false,
          priority: task.priority ?? 4,
          projectId: task.projectId || 'inbox',
          isStarred: task.isStarred ?? false,
          isPinned: task.isPinned ?? false,
          taskType: task.taskType || 'personal',
          createdAt: task.createdAt || Date.now(),
          // Ensure date fields are Date objects if they exist
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
          // Validate arrays
          tags: Array.isArray(task.tags) ? task.tags : [],
          collaborators: Array.isArray(task.collaborators) ? task.collaborators : [],
          comments: Array.isArray(task.comments) ? task.comments : [],
          // Validate attachments array and individual attachments
          attachments: Array.isArray(task.attachments)
            ? task.attachments.map((att: any): FileAttachment => {
                const validatedAtt = {
                  id: att.id || crypto.randomUUID(), // Ensure ID exists
                  name: att.name || 'Unnamed File',
                  // Provide default mimeType if missing, try to guess from name if possible
                  mimeType: att.mimeType || mime.lookup(att.name || '') || 'application/octet-stream',
                  size: typeof att.size === 'number' ? att.size : 0, // Ensure size is a number
                  thumbnailUrl: att.thumbnailUrl, // Keep as is, can be undefined
                  downloadUrl: att.downloadUrl || '#', // Provide a fallback URL
                };
                // Log if mimeType was originally missing
                if (!att.mimeType) {
                  console.warn(`Cache Load: Attachment (ID: ${validatedAtt.id}, Name: ${validatedAtt.name}) in task ${task.id} was missing mimeType. Defaulted to ${validatedAtt.mimeType}.`);
                }
                return validatedAtt;
              })
            : [], // Default to empty array if not an array
        }));

        this.cache.set('tasks', { tasks: validatedTasks, timestamp });
        console.log('Cache loaded and validated from localStorage.');

      }
    } catch (error) {
      console.error('Error loading/parsing/validating cache from localStorage:', error);
      // Clear potentially corrupted cache
      localStorage.removeItem('taskCache');
    }
  }

  private saveToLocalStorage() {
    try {
      const cachedData = this.cache.get('tasks');
      if (cachedData) {
        // Ensure dates are stored in a serializable format (ISO string)
        const tasksToSave = cachedData.tasks.map(task => ({
          ...task,
          dueDate: task.dueDate ?
            (typeof task.dueDate === 'string' ? task.dueDate :
             (typeof task.dueDate === 'object' && task.dueDate !== null ? 
              (typeof (task.dueDate as any).toISOString === 'function' ? 
               (task.dueDate as any).toISOString() : 
               JSON.stringify(task.dueDate)) :
              String(task.dueDate)))
            : undefined,
          // createdAt is already a number (timestamp), which is fine for JSON
        }));
        localStorage.setItem('taskCache', JSON.stringify({ tasks: tasksToSave, timestamp: cachedData.timestamp }));
      }
    } catch (error) {
      console.error('Error saving cache to localStorage:', error);
    }
  }

  public setTasks(tasks: Task[]) {
    this.cache.set('tasks', {
      tasks,
      timestamp: Date.now()
    });
    this.saveToLocalStorage();
  }

  public getTasks(): Task[] | null {
    const cachedData = this.cache.get('tasks');
    if (!cachedData) return null;

    // Check if cache is still valid
    if (Date.now() - cachedData.timestamp > this.CACHE_DURATION) {
      console.log('Cache expired, clearing in-memory cache.');
      this.cache.delete('tasks');
      localStorage.removeItem('taskCache'); // Also clear expired data from storage
      return null;
    }

    // Return a deep copy to prevent direct mutation of cached data
    // Although Zustand handles immutability, this adds an extra layer of safety for cache reads
    try {
        return JSON.parse(JSON.stringify(cachedData.tasks));
    } catch (e) {
        console.error("Error deep cloning cached tasks:", e);
        return cachedData.tasks; // Fallback to shallow copy
    }
  }

  public clear() {
    this.cache.clear();
    localStorage.removeItem('taskCache');
    console.log('Task cache cleared.');
  }
}

export const taskCache = TaskCache.getInstance();
