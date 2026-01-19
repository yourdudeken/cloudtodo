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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>
                        Add a new task to your list. It will be saved directly to your Google Drive.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Task Title</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Finish project report"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <textarea
                            id="description"
                            className="flex min-h-[80px] w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Add details about your task..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="dueDate">Due Date</Label>
                            <Input
                                id="dueDate"
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="dueTime">Due Time</Label>
                            <Input
                                id="dueTime"
                                type="time"
                                value={formData.dueTime}
                                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="priority">Priority</Label>
                        <select
                            id="priority"
                            className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white"
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) as PriorityLevel })}
                        >
                            <option value={1}>High</option>
                            <option value={2}>Medium</option>
                            <option value={3}>Low</option>
                        </select>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Task
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
