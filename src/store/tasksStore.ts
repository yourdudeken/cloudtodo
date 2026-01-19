import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task } from '@/types';
import { googleDriveService } from '@/lib/googleDrive';

interface TasksState {
    tasks: Task[];
    isLoading: boolean;
    error: string | null;
    fetchTasks: () => Promise<void>;
    addTask: (task: Omit<Task, 'id' | 'googleDriveFileId'>) => Promise<void>;
    updateTask: (task: Task) => Promise<void>;
    deleteTask: (id: string, fileId: string) => Promise<void>;
}

export const useTasksStore = create<TasksState>()(
    persist(
        (set) => ({
            tasks: [],
            isLoading: false,
            error: null,

            fetchTasks: async () => {
                set({ isLoading: true, error: null });
                try {
                    const tasks = await googleDriveService.listTasks();
                    set({ tasks, isLoading: false });
                } catch (error) {
                    console.error('Failed to fetch tasks:', error);
                    set({ error: 'Failed to fetch tasks', isLoading: false });
                }
            },

            addTask: async (newTask) => {
                set({ isLoading: true, error: null });
                try {
                    const savedTask = await googleDriveService.createTask(newTask);
                    set((state) => ({
                        tasks: [...state.tasks, savedTask],
                        isLoading: false
                    }));
                } catch (error) {
                    console.error('Failed to add task:', error);
                    set({ error: 'Failed to add task', isLoading: false });
                }
            },

            updateTask: async (updatedTask) => {
                set({ isLoading: true, error: null });
                try {
                    await googleDriveService.updateTask(updatedTask);
                    set((state) => ({
                        tasks: state.tasks.map((t) =>
                            t.id === updatedTask.id ? updatedTask : t
                        ),
                        isLoading: false
                    }));
                } catch (error) {
                    console.error('Failed to update task:', error);
                    set({ error: 'Failed to update task', isLoading: false });
                }
            },

            deleteTask: async (id, fileId) => {
                set({ isLoading: true, error: null });
                try {
                    await googleDriveService.deleteTask(fileId);
                    set((state) => ({
                        tasks: state.tasks.filter((t) => t.id !== id),
                        isLoading: false
                    }));
                } catch (error) {
                    console.error('Failed to delete task:', error);
                    set({ error: 'Failed to delete task', isLoading: false });
                }
            },
        }),
        {
            name: 'tasks-storage',
            partialize: (state) => ({ tasks: state.tasks }), // Only persist tasks
        }
    )
);
