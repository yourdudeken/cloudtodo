import { create } from 'zustand';
import { Todo } from '../types/todo';
import { createOrUpdateTodoFile, getTodos } from '../lib/google-drive';
import { useAuthStore } from './auth';

interface TodoState {
  todos: Todo[];
  isLoading: boolean;
  error: string | null;
  view: 'list' | 'kanban' | 'calendar';
  theme: 'light' | 'dark' | 'system';
  categories: string[];
  fetchTodos: () => Promise<void>;
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTodo: (id: string, todo: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  toggleTodoComplete: (id: string) => Promise<void>;
  toggleStarred: (id: string) => Promise<void>;
  togglePinned: (id: string) => Promise<void>;
  addSubtask: (todoId: string, subtask: Omit<SubTask, 'id'>) => Promise<void>;
  updateSubtask: (todoId: string, subtaskId: string, completed: boolean) => Promise<void>;
  addComment: (todoId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => Promise<void>;
  addAttachment: (todoId: string, attachment: Omit<Attachment, 'id' | 'uploadedAt'>) => Promise<void>;
  setView: (view: 'list' | 'kanban' | 'calendar') => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  filterTodos: (filters: {
    category?: string;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high';
    completed?: boolean;
    starred?: boolean;
    pinned?: boolean;
  }) => Todo[];
  getRecurringTodos: () => Todo[];
  getDueTodos: () => Todo[];
  getOverdueTodos: () => Todo[];
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  isLoading: false,
  error: null,
  view: 'list',
  theme: 'system',
  categories: [],

  fetchTodos: async () => {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) return;

    set({ isLoading: true });
    try {
      const todos = await getTodos(accessToken);
      set({ 
        todos,
        categories: [...new Set(todos.map(todo => todo.category).filter(Boolean))],
        isLoading: false 
      });
    } catch (error) {
      set({ error: 'Failed to fetch todos', isLoading: false });
    }
  },

  addTodo: async (todo) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) return;

    const newTodo: Todo = {
      ...todo,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const todos = [...get().todos, newTodo];
    set({ 
      todos,
      categories: [...new Set(todos.map(t => t.category).filter(Boolean))]
    });
    await createOrUpdateTodoFile(todos, accessToken);
  },

  updateTodo: async (id, updates) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) return;

    const todos = get().todos.map((todo) =>
      todo.id === id
        ? { ...todo, ...updates, updatedAt: new Date().toISOString() }
        : todo
    );
    set({ 
      todos,
      categories: [...new Set(todos.map(todo => todo.category).filter(Boolean))]
    });
    await createOrUpdateTodoFile(todos, accessToken);
  },

  deleteTodo: async (id) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) return;

    const todos = get().todos.filter((todo) => todo.id !== id);
    set({ 
      todos,
      categories: [...new Set(todos.map(todo => todo.category).filter(Boolean))]
    });
    await createOrUpdateTodoFile(todos, accessToken);
  },

  toggleTodoComplete: async (id) => {
    const todo = get().todos.find(t => t.id === id);
    if (todo) {
      await get().updateTodo(id, { completed: !todo.completed });
    }
  },

  toggleStarred: async (id) => {
    const todo = get().todos.find(t => t.id === id);
    if (todo) {
      await get().updateTodo(id, { isStarred: !todo.isStarred });
    }
  },

  togglePinned: async (id) => {
    const todo = get().todos.find(t => t.id === id);
    if (todo) {
      await get().updateTodo(id, { isPinned: !todo.isPinned });
    }
  },

  addSubtask: async (todoId, subtask) => {
    const todo = get().todos.find(t => t.id === todoId);
    if (todo) {
      const newSubtask = {
        ...subtask,
        id: crypto.randomUUID(),
      };
      await get().updateTodo(todoId, {
        subtasks: [...todo.subtasks, newSubtask]
      });
    }
  },

  updateSubtask: async (todoId, subtaskId, completed) => {
    const todo = get().todos.find(t => t.id === todoId);
    if (todo) {
      const updatedSubtasks = todo.subtasks.map(st =>
        st.id === subtaskId ? { ...st, completed } : st
      );
      await get().updateTodo(todoId, { subtasks: updatedSubtasks });
    }
  },

  addComment: async (todoId, comment) => {
    const todo = get().todos.find(t => t.id === todoId);
    if (todo) {
      const newComment = {
        ...comment,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      await get().updateTodo(todoId, {
        comments: [...todo.comments, newComment]
      });
    }
  },

  addAttachment: async (todoId, attachment) => {
    const todo = get().todos.find(t => t.id === todoId);
    if (todo) {
      const newAttachment = {
        ...attachment,
        id: crypto.randomUUID(),
        uploadedAt: new Date().toISOString(),
      };
      await get().updateTodo(todoId, {
        attachments: [...todo.attachments, newAttachment]
      });
    }
  },

  setView: (view) => set({ view }),
  setTheme: (theme) => set({ theme }),

  filterTodos: ({ category, tags, priority, completed, starred, pinned }) => {
    return get().todos.filter(todo => {
      if (category && todo.category !== category) return false;
      if (tags && !tags.every(tag => todo.tags.includes(tag))) return false;
      if (priority && todo.priority !== priority) return false;
      if (completed !== undefined && todo.completed !== completed) return false;
      if (starred !== undefined && todo.isStarred !== starred) return false;
      if (pinned !== undefined && todo.isPinned !== pinned) return false;
      return true;
    });
  },

  getRecurringTodos: () => {
    return get().todos.filter(todo => todo.isRecurring);
  },

  getDueTodos: () => {
    const now = new Date();
    return get().todos.filter(todo => {
      if (!todo.dueDate) return false;
      const dueDate = new Date(todo.dueDate);
      return dueDate > now && dueDate <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
    });
  },

  getOverdueTodos: () => {
    const now = new Date();
    return get().todos.filter(todo => {
      if (!todo.dueDate) return false;
      return new Date(todo.dueDate) < now && !todo.completed;
    });
  },
}));