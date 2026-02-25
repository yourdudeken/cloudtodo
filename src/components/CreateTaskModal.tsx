import { useState } from 'react';
import { useTasksStore } from '@/store/tasksStore';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import type { PriorityLevel } from '@/types';

export function CreateTaskModal() {
    const [open, setOpen] = useState(false);
    const { addTask, isLoading } = useTasksStore();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        dueDate: '',
        dueTime: '',
        priority: 2 as PriorityLevel,
        categories: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        await addTask({
            taskTitle: formData.title,
            description: formData.description,
            dueDate: formData.dueDate,
            dueTime: formData.dueTime,
            reminder: 30,
            priority: formData.priority,
            taskType: { isPersonal: true, isCollaborative: false },
            isStarred: false,
            isPinned: false,
            categories: formData.categories.split(',').map(c => c.trim()).filter(Boolean),
            tags: [],
            recurrence: 'None',
            status: 'todo',
            attachments: { audio: [], images: [], documents: [], videos: [] },
            comments: [],
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString(),
        });

        setOpen(false);
        setFormData({
            title: '',
            description: '',
            dueDate: '',
            dueTime: '',
            priority: 2,
            categories: '',
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="flex items-center gap-3 w-full px-4 py-3 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-900/20 text-white">
                    <Plus className="w-5 h-5" />
                    <span className="font-semibold">New Task</span>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-black/90 backdrop-blur-3xl border-white/10 text-white rounded-[2rem] shadow-2xl">
                <DialogHeader>
                    <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-4 border border-indigo-500/20">
                        <Plus className="w-6 h-6 text-indigo-400" />
                    </div>
                    <DialogTitle className="text-2xl font-bold tracking-tight">Create New Task</DialogTitle>
                    <DialogDescription className="text-gray-500 font-medium">
                        Stored securely in your CloudTodo folder on Google Drive.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title" className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Task Title</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Design system review"
                            required
                            className="bg-white/[0.03] border-white/5 rounded-xl h-12 focus:ring-indigo-500/20 focus:border-indigo-500/40"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Description</Label>
                        <textarea
                            id="description"
                            className="flex min-h-[100px] w-full rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3 text-sm ring-offset-background placeholder:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50 text-white transition-all"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Details about your objective..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="dueDate" className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Due Date</Label>
                            <Input
                                id="dueDate"
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                className="bg-white/[0.03] border-white/5 rounded-xl focus:ring-indigo-500/20 h-10"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="dueTime" className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Time</Label>
                            <Input
                                id="dueTime"
                                type="time"
                                value={formData.dueTime}
                                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                                className="bg-white/[0.03] border-white/5 rounded-xl focus:ring-indigo-500/20 h-10"
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="priority" className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Priority Level</Label>
                        <select
                            id="priority"
                            className="flex h-11 w-full rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 text-white appearance-none cursor-pointer"
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) as PriorityLevel })}
                        >
                            <option value={1}>Critical (High)</option>
                            <option value={2}>Standard (Medium)</option>
                            <option value={3}>Optional (Low)</option>
                        </select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="categories" className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Categories</Label>
                        <Input
                            id="categories"
                            value={formData.categories}
                            onChange={(e) => setFormData({ ...formData, categories: e.target.value })}
                            placeholder="e.g. Work, Urgent, Personal"
                            className="bg-white/[0.03] border-white/5 rounded-xl h-12 focus:ring-indigo-500/20 focus:border-indigo-500/40"
                        />
                    </div>
                    <DialogFooter className="mt-4">
                        <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 font-bold transition-all">
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
                            Initialize Task
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
