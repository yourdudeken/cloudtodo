
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useTasksStore } from '@/store/tasksStore';
import { LogOut, Plus, Search, User } from 'lucide-react';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';
import type { Task } from '@/types';

export default function Dashboard() {
    const { user, logout } = useAuthStore();
    const { tasks, fetchTasks, isLoading } = useTasksStore();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    return (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-800/50 backdrop-blur-xl border-r border-gray-700/50 flex flex-col hidden md:flex">
                <div className="p-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        CloudTodo
                    </h1>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <CreateTaskModal />

                    <div className="mt-8 space-y-1">
                        <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Views
                        </p>
                        {['All Tasks', 'Today', 'Upcoming', 'Completed'].map((item) => (
                            <a
                                key={item}
                                href="#"
                                className="flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <span>{item}</span>
                            </a>
                        ))}
                    </div>
                </nav>

                <div className="p-4 border-t border-gray-700/50">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                        {user?.picture ? (
                            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                        ) : (
                            <User className="w-8 h-8 p-1 rounded-full bg-indigo-500" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.name}</p>
                            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 mt-4 ml-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
                    >
                        <LogOut className="w-3 h-3" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-gray-900 to-gray-800">
                {/* Header */}
                <header className="h-16 border-b border-gray-700/50 flex items-center justify-between px-8 bg-gray-900/50 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-full max-w-md group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-gray-600 text-gray-200"
                            />
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-auto p-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.name?.split(' ')[0]}</h2>
                            <p className="text-gray-400">Here's what you need to focus on today.</p>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="text-indigo-400 animate-pulse">Loading tasks from Drive...</div>
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-700 rounded-3xl bg-gray-800/30">
                                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                                    <Plus className="w-8 h-8 text-indigo-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-1">No tasks yet</h3>
                                <p className="text-gray-400 max-w-xs mb-6">Create your first task to get started with your new productivity journey.</p>
                                <div className="invisible">
                                    {/* Placeholder to keep layout consistent if needed or remove button since main create is in sidebar */}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        onClick={() => setSelectedTask(task)}
                                        className="p-6 bg-gray-800 border border-gray-700 rounded-2xl hover:border-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/5 group cursor-pointer"
                                    >
                                        <h3 className="font-semibold text-lg mb-2 group-hover:text-indigo-400 transition-colors">{task.taskTitle}</h3>
                                        <p className="text-gray-400 text-sm line-clamp-3 mb-4">{task.description}</p>
                                        <div className="flex items-center gap-2 mt-auto text-xs text-gray-500">
                                            <span className="px-2 py-1 bg-gray-700 rounded-md">{task.status}</span>
                                            <span>{task.dueDate}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <TaskDetailsModal
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
            />
        </div>
    );
}
