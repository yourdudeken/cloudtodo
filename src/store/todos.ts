import { create } from 'zustand';
import { Todo } from '../types/todo';
import { api } from '../lib/api';
import { useAuthStore } from './auth';
import { trainNetworks, predictPriority, predictCompletionTime, generateSuggestions, logTaskCompletion } from '../lib/ai';

interface TodoState {
  todos: Todo[];
  isLoading: boolean;
  error: string | null;
  view: 'list' | 'kanban' | 'calendar';
  theme: 'light' | 'dark' | 'system';
  categories: string[];
  suggestions: string[];
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
  updateSuggestions: () => void;
  getPredictedCompletionTime: (taskName: string) => number;
  logCompletion: (taskName: string, timeTaken: number) => void;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  isLoading: false,
  error: null,
  view: 'list',
  theme: 'system',
  categories: [],
  suggestions: [],

  fetchTodos: async () => {
    set({ isLoading: true });
    try {
      const todos = await api.fetchTodos();
      set({ 
        todos,
        categories: [...new Set(todos.map(todo => todo.category).filter(Boolean))],
        isLoading: false 
      });
      trainNetworks(todos);
      get().updateSuggestions();
    } catch (error) {
      set({ error: 'Failed to fetch todos', isLoading: false });
    }
  },

  addTodo: async (todo) => {
    const priority = predictPriority(todo);
    const newTodo: Todo = {
      ...todo,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      priority: priority > 0.7 ? 'high' : priority > 0.3 ? 'medium' : 'low',
      subtasks: [],
      attachments: [],
      comments: [],
      tags: todo.tags || [],
    };

    const todos = [...get().todos, newTodo];
    set({ 
      todos,
      categories: [...new Set(todos.map(t => t.category).filter(Boolean))]
    });
    await api.saveTodos(todos);
    get().updateSuggestions();
  },

  updateTodo: async (id, updates) => {
    const todos = get().todos.map((todo) =>
      todo.id === id
        ? { ...todo, ...updates, updatedAt: new Date().toISOString() }
        : todo
    );
    set({ 
      todos,
      categories: [...new Set(todos.map(todo => todo.category).filter(Boolean))]
    });
    await api.saveTodos(todos);
    trainNetworks(todos);
  },

  deleteTodo: async (id) => {
    const todos = get().todos.filter((todo) => todo.id !== id);
    set({ 
      todos,
      categories: [...new Set(todos.map(todo => todo.category).filter(Boolean))]
    });
    await api.saveTodos(todos);
    get().updateSuggestions();
  },

  toggleTodoComplete: async (id) => {
    const todo = get().todos.find(t => t.id === id);
    if (todo) {
      const startTime = todo.startTime ? new Date(todo.startTime).getTime() : Date.now();
      const timeTaken = Math.round((Date.now() - startTime) / (1000 * 60)); // Convert to minutes
      
      if (!todo.completed) {
        logTaskCompletion(todo.title, timeTaken);
      }
      
      await get().updateTodo(id, { 
        completed: !todo.completed,
        completedAt: !todo.completed ? new Date().toISOString() : undefined,
        actualDuration: !todo.completed ? timeTaken : undefined
      });
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

  updateSuggestions: () => {
    const suggestions = generateSuggestions(get().todos);
    set({ suggestions });
  },

  getPredictedCompletionTime: (taskName: string) => {
    return predictCompletionTime(taskName);
  },

  logCompletion: (taskName: string, timeTaken: number) => {
    logTaskCompletion(taskName, timeTaken);
    trainNetworks(get().todos);
  },
}));