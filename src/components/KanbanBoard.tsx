import { useTasksStore } from '@/store/tasksStore';
import type { Task } from '@/types';
import { MoreHorizontal, Plus, ArrowRight, Clock, CheckCircle2, Circle } from 'lucide-react';

export function KanbanBoard({ onTaskClick }: { onTaskClick: (task: Task) => void }) {
    const { tasks, updateTaskStatus, selectedCategory } = useTasksStore();

    const statuses = [
        { id: 'todo', label: 'To Do', icon: Circle, color: 'text-gray-400' },
        { id: 'in-progress', label: 'In Progress', icon: Clock, color: 'text-indigo-400' },
        { id: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-green-400' },
    ];

    const filteredTasks = selectedCategory
        ? tasks.filter(t => t.categories.includes(selectedCategory))
        : tasks;

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const onDrop = (e: React.DragEvent, status: string) => {
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            updateTaskStatus(taskId, status as any);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full min-h-[500px]">
            {statuses.map((column) => (
                <div
                    key={column.id}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, column.id)}
                    className="flex flex-col h-full bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-6"
                >
                    <div className="flex items-center justify-between mb-8 px-2">
                        <div className="flex items-center gap-3">
                            <column.icon className={`w-5 h-5 ${column.color}`} />
                            <h3 className="font-bold text-lg tracking-tight text-white">{column.label}</h3>
                            <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-[10px] font-black text-gray-500 border border-white/5">
                                {filteredTasks.filter(t => t.status === column.id).length}
                            </span>
                        </div>
                        <button className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-500">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                        {filteredTasks
                            .filter((t) => t.status === column.id)
                            .map((task) => (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('taskId', task.id);
                                        e.dataTransfer.setData('fileId', task.googleDriveFileId || '');
                                    }}
                                    onClick={() => onTaskClick(task)}
                                    className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl hover:border-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/5 group cursor-grab active:cursor-grabbing backdrop-blur-sm"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${task.priority === 1 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                            task.priority === 2 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                            }`}>
                                            {task.priority === 1 ? 'High' : task.priority === 2 ? 'Med' : 'Low'}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors leading-tight">
                                        {task.taskTitle}
                                    </h4>
                                    <p className="text-gray-500 text-xs line-clamp-2 mb-4 leading-relaxed">
                                        {task.description}
                                    </p>

                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                                        <span className="text-[10px] font-medium text-gray-600">{task.dueDate || 'No date'}</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                </div>
                            ))}

                        <button className="w-full py-4 border border-dashed border-white/5 rounded-3xl text-gray-600 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-white/[0.01] transition-all flex items-center justify-center gap-2 group">
                            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold uppercase tracking-widest">Add Task</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
