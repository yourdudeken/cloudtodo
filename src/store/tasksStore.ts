import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, Attachments, AttachmentItem } from '@/types';
import { googleDriveService } from '@/lib/googleDrive';

interface TasksState {
    tasks: Task[];
    folderIds: Record<string, string> | null;
    viewMode: 'grid' | 'kanban';
    selectedCategory: string | null;
    isLoading: boolean;
    error: string | null;
    fetchTasks: () => Promise<void>;
    addTask: (task: Omit<Task, 'id' | 'googleDriveFileId'>) => Promise<Task>;
    updateTask: (task: Task) => Promise<void>;
    updateTaskStatus: (id: string, status: Task['status']) => Promise<void>;
    deleteTask: (id: string, fileId: string) => Promise<void>;
    setViewMode: (mode: 'grid' | 'kanban') => void;
    setSelectedCategory: (category: string | null) => void;
}

export const useTasksStore = create<TasksState>()(
    persist(
        (set) => ({
            tasks: [],
            folderIds: null,
            viewMode: 'grid',
            selectedCategory: null,
            isLoading: false,
            error: null,

            fetchTasks: async () => {
                const { folderIds } = useTasksStore.getState();
                set({ isLoading: true, error: null });
                try {
                    const result = await googleDriveService.listTasks(folderIds?.ROOT);
                    // If we didn't have folderIds, listTasks will have called ensureFolderStructure
                    // and return tasks. We should ensure we have the folders now.
                    if (!folderIds) {
                        const folders = await googleDriveService.ensureFolderStructure();
                        set({ tasks: result, folderIds: folders, isLoading: false });
                    } else {
                        set({ tasks: result, isLoading: false });
                    }
                } catch (error) {
                    console.error('Failed to fetch tasks:', error);
                    set({ error: 'Failed to fetch tasks', isLoading: false });
                }
            },

            addTask: async (newTask) => {
                const { folderIds } = useTasksStore.getState();
                set({ isLoading: true, error: null });
                try {
                    const savedTask = await googleDriveService.createTask(newTask, folderIds?.ROOT);
                    set((state) => ({
                        tasks: [...state.tasks, savedTask],
                        isLoading: false
                    }));
                    return savedTask;
                } catch (error) {
                    console.error('Failed to add task:', error);
                    set({ error: 'Failed to add task', isLoading: false });
                    throw error;
                }
            },

            updateTask: async (updatedTask) => {
                set({ isLoading: true, error: null });
                try {
                    await googleDriveService.updateTask(updatedTask);
                    set((state) => ({
                        tasks: state.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
                        isLoading: false
                    }));
                } catch (error) {
                    console.error('Failed to update task:', error);
                    set({ error: 'Failed to update task', isLoading: false });
                }
            },

            updateTaskStatus: async (id, status) => {
                set((state) => ({
                    tasks: state.tasks.map((t) => t.id === id ? { ...t, status } : t)
                }));
                try {
                    const task = useTasksStore.getState().tasks.find(t => t.id === id);
                    if (task) {
                        await googleDriveService.updateTask(task);
                    }
                } catch (error) {
                    console.error('Failed to update task status:', error);
                }
            },

            deleteTask: async (id, fileId) => {
                set({ isLoading: true, error: null });
                try {
                    const task = useTasksStore.getState().tasks.find(t => t.id === id);
                    if (task) {
                        // Delete all attachments from Drive
                        const attachmentTypes: (keyof Attachments)[] = ['audio', 'images', 'documents', 'videos'];
                        for (const type of attachmentTypes) {
                            const items = task.attachments[type] as (string | AttachmentItem)[];
                            for (const item of items) {
                                const attachmentFileId = typeof item === 'string' ? item : item.id;
                                try {
                                    await googleDriveService.deleteTask(attachmentFileId);
                                } catch (e) {
                                    console.error(`Failed to delete attachment ${attachmentFileId}`, e);
                                }
                            }
                        }
                    }

                    // Delete the task file itself
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

            setViewMode: (viewMode) => set({ viewMode }),
            setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
        }),
        {
            name: 'tasks-storage',
            partialize: (state) => ({
                tasks: state.tasks,
                folderIds: state.folderIds,
                viewMode: state.viewMode,
            }),
        }
    )
);
