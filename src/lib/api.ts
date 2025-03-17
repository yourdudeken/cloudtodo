import axios from 'axios';
import { Todo } from '../types/todo';

const API_URL = 'http://localhost:3001/api';

// Configure axios to include credentials
axios.defaults.withCredentials = true;

export const api = {
  async login(): Promise<void> {
    window.location.href = `${API_URL}/auth/google`;
  },

  async logout(): Promise<void> {
    try {
      await axios.get(`${API_URL}/auth/logout`);
      
      // Clear axios defaults
      delete axios.defaults.headers.common['Authorization'];
      
      // Clear any stored cookies
      document.cookie.split(';').forEach(cookie => {
        document.cookie = cookie
          .replace(/^ +/, '')
          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });
    } catch (error) {
      console.error('Logout request failed:', error);
      // Continue with local cleanup even if the request fails
    }
  },

  async verifyCode(code: string): Promise<boolean> {
    try {
      const response = await axios.post(`${API_URL}/auth/verify`, { code });
      return response.data.success;
    } catch (error) {
      console.error('Verification failed:', error);
      return false;
    }
  },

  async fetchTodos(): Promise<Todo[]> {
    const response = await axios.get(`${API_URL}/todos`);
    return response.data;
  },

  async saveTodos(todos: Todo[]): Promise<void> {
    await axios.post(`${API_URL}/todos`, todos);
  },

  async sendReminder(todo: Todo): Promise<void> {
    await axios.post(`${API_URL}/send-reminder`, {
      taskId: todo.id,
      taskName: todo.title,
      dueDate: todo.dueDate,
      priority: todo.priority
    });
  }
};