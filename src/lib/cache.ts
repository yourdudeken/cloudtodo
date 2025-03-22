import { Task } from '@/store/tasks';

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
        const { tasks, timestamp } = JSON.parse(savedCache);
        if (Date.now() - timestamp < this.CACHE_DURATION) {
          this.cache.set('tasks', { tasks, timestamp });
        }
      }
    } catch (error) {
      console.error('Error loading cache from localStorage:', error);
    }
  }

  private saveToLocalStorage() {
    try {
      const cachedData = this.cache.get('tasks');
      if (cachedData) {
        localStorage.setItem('taskCache', JSON.stringify(cachedData));
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
      this.cache.delete('tasks');
      return null;
    }

    return cachedData.tasks;
  }

  public clear() {
    this.cache.clear();
    localStorage.removeItem('taskCache');
  }
}

export const taskCache = TaskCache.getInstance();