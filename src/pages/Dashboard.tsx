
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useTasksStore } from '@/store/tasksStore';
import { LogOut, Plus, Search, User, Loader2, ArrowRight } from 'lucide-react';
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
        <div className="flex h-screen bg-black text-white overflow-hidden font-sans relative">
            {/* Background Effects matching Landing/Login */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse delay-700"></div>
            </div>

            {/* Sidebar */}
            <aside className="w-72 bg-white/[0.02] backdrop-blur-3xl border-r border-white/5 flex flex-col hidden md:flex relative z-10">
                <div className="p-8">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform duration-300">
                            <Plus className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            CloudTodo
                        </span>
                    </div>
                </div>

                <nav className="flex-1 px-6 space-y-6">
                    <CreateTaskModal />

                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">
                            Views
                        </p>
                        {['All Tasks', 'Today', 'Upcoming', 'Completed'].map((item) => (
                            <a
                                key={item}
                                href="#"
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${item === 'All Tasks'
                                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <span className="font-medium">{item}</span>
                            </a>
                        ))}
                    </div>
                </nav>

                <div className="p-6 border-t border-white/5">
                    <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-inner">
                        {user?.picture ? (
                            <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full border border-white/10" />
                        ) : (
                            <User className="w-10 h-10 p-2 rounded-full bg-indigo-500/20 text-indigo-400" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate text-white">{user?.name}</p>
                            <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 mt-6 ml-4 text-xs font-semibold text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10">
                {/* Header */}
                <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-black/20 backdrop-blur-md">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-full max-w-sm group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all placeholder:text-gray-600 text-gray-200"
                            />
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-auto p-10 pt-12">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-12">
                            <h2 className="text-4xl font-black text-white mb-3 tracking-tight">
                                Welcome back, {user?.name?.split(' ')[0]}
                            </h2>
                            <p className="text-gray-400 text-lg font-medium">Here's your productivity overview.</p>
                        </div>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-4">
                                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                <div className="text-gray-500 font-medium animate-pulse">Syncing with Drive...</div>
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.01]">
                                <div className="w-20 h-20 bg-white/[0.03] rounded-3xl flex items-center justify-center mb-6 border border-white/5">
                                    <Plus className="w-10 h-10 text-indigo-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Clean slate</h3>
                                <p className="text-gray-500 max-w-sm mb-8">Ready to start organizing your tasks? Create your first one above.</p>
                                <div className="invisible">
                                    {/* Placeholder */}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                                {tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        onClick={() => setSelectedTask(task)}
                                        className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:border-indigo-500/30 transition-all hover:shadow-2xl hover:shadow-indigo-500/5 group cursor-pointer backdrop-blur-sm"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${task.priority === 1 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                task.priority === 2 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                                    'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                }`}>
                                                {task.priority === 1 ? 'High' : task.priority === 2 ? 'Med' : 'Low'}
                                            </span>
                                            <span className="text-[11px] font-medium text-gray-500">{task.dueDate || 'No date'}</span>
                                        </div>
                                        <h3 className="font-bold text-xl mb-3 group-hover:text-indigo-400 transition-colors leading-tight">{task.taskTitle}</h3>
                                        <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed mb-6">{task.description}</p>
                                        <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                                            <div className="flex -space-x-2">
                                                {/* Placeholder for attachments/users */}
                                                <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                    {task.status.charAt(0).toUpperCase()}
                                                </div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
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
