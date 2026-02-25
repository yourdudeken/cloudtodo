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
import { Plus, Loader2, Paperclip, X, Image, Music, Video, File as FileIcon, Star, Pin, User, Users } from 'lucide-react';
import type { PriorityLevel, Attachments } from '@/types';
import { googleDriveService, SUBFOLDERS } from '@/lib/googleDrive';

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
        isStarred: false,
        isPinned: false,
        isPersonal: true,
        collaboratorEmail: ''
    });

    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <Image className="w-4 h-4 text-pink-400" />;
        if (type.startsWith('video/')) return <Video className="w-4 h-4 text-purple-400" />;
        if (type.startsWith('audio/')) return <Music className="w-4 h-4 text-indigo-400" />;
        return <FileIcon className="w-4 h-4 text-blue-400" />;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        const attachments: Attachments = { audio: [], images: [], documents: [], videos: [] };

        try {
            for (const file of files) {
                let category: keyof typeof SUBFOLDERS = 'DOCUMENTS';
                if (file.type.startsWith('image/')) category = 'PICTURES';
                else if (file.type.startsWith('video/')) category = 'VIDEOS';
                else if (file.type.startsWith('audio/')) category = 'AUDIOS';

                const uploaded = await googleDriveService.uploadAttachment(file, category);
                const item = { id: uploaded.id, name: uploaded.name, mimeType: uploaded.mimeType };

                if (category === 'PICTURES') attachments.images.push(item);
                else if (category === 'VIDEOS') attachments.videos.push(item);
                else if (category === 'AUDIOS') attachments.audio.push(item);
                else attachments.documents.push(item);
            }

            const savedTask = await addTask({
                taskTitle: formData.title,
                description: formData.description,
                dueDate: formData.dueDate,
                dueTime: formData.dueTime,
                reminder: 30,
                priority: formData.priority,
                taskType: {
                    isPersonal: formData.isPersonal,
                    isCollaborative: !formData.isPersonal
                },
                isStarred: formData.isStarred,
                isPinned: formData.isPinned,
                categories: formData.categories.split(',').map(c => c.trim()).filter(c => c),
                tags: [],
                recurrence: 'None',
                status: 'todo',
                attachments,
                comments: [],
                createdDate: new Date().toISOString(),
                updatedDate: new Date().toISOString(),
            });

            // If collaborative and email provided, share the file
            if (!formData.isPersonal && formData.collaboratorEmail && savedTask.googleDriveFileId) {
                await googleDriveService.shareFile(savedTask.googleDriveFileId, formData.collaboratorEmail);
            }

            setOpen(false);
            setFormData({
                title: '',
                description: '',
                dueDate: '',
                dueTime: '',
                priority: 2,
                categories: '',
                isStarred: false,
                isPinned: false,
                isPersonal: true,
                collaboratorEmail: ''
            });
            setFiles([]);
        } catch (error) {
            console.error('Task creation failed:', error);
        } finally {
            setIsUploading(false);
        }
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
                <form onSubmit={handleSubmit} className="grid gap-6 py-4 overflow-y-auto max-h-[80vh] px-1">
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

                    <div className="flex items-center gap-4 py-2">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${formData.isPinned ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/5 text-gray-500'}`}
                        >
                            <Pin className={`w-3.5 h-3.5 ${formData.isPinned ? 'fill-current' : ''}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Pin</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isStarred: !formData.isStarred })}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${formData.isStarred ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-white/5 border-white/5 text-gray-500'}`}
                        >
                            <Star className={`w-3.5 h-3.5 ${formData.isStarred ? 'fill-current' : ''}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Star</span>
                        </button>
                        <div className="flex items-center gap-1 bg-white/5 border border-white/5 p-1 rounded-xl ml-auto">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isPersonal: true })}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formData.isPersonal ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}
                            >
                                <User className="w-3 h-3" /> Personal
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isPersonal: false })}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!formData.isPersonal ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}
                            >
                                <Users className="w-3 h-3" /> Collab
                            </button>
                        </div>
                    </div>

                    {!formData.isPersonal && (
                        <div className="grid gap-2 animate-in slide-in-from-top-4 duration-500 fade-in">
                            <Label htmlFor="collaboratorEmail" className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-1">Collaborator Email</Label>
                            <Input
                                id="collaboratorEmail"
                                type="email"
                                value={formData.collaboratorEmail}
                                onChange={(e) => setFormData({ ...formData, collaboratorEmail: e.target.value })}
                                placeholder="teammate@example.com"
                                required={!formData.isPersonal}
                                className="bg-indigo-500/5 border-indigo-500/20 rounded-xl h-12 focus:ring-indigo-500/20 focus:border-indigo-500/40"
                            />
                            <p className="text-[9px] text-gray-400 ml-1 italic">They will be granted write access via Google Drive.</p>
                        </div>
                    )}
                    <div className="grid gap-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Priority Level</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { val: 1, label: 'High', color: 'bg-red-500', border: 'border-red-500/20', text: 'text-red-400' },
                                { val: 2, label: 'Medium', color: 'bg-orange-500', border: 'border-orange-500/20', text: 'text-orange-400' },
                                { val: 3, label: 'Low', color: 'bg-indigo-500', border: 'border-indigo-500/20', text: 'text-indigo-400' }
                            ].map((p) => (
                                <button
                                    key={p.val}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, priority: p.val as PriorityLevel })}
                                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all duration-300 ${formData.priority === p.val
                                        ? `${p.border} ${p.color}/20 ring-1 ring-${p.color.split('-')[1]}-500/50`
                                        : 'bg-white/[0.02] border-white/5 opacity-40 grayscale hover:opacity-100 hover:grayscale-0'
                                        }`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${p.color}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${formData.priority === p.val ? p.text : 'text-gray-500'}`}>
                                        {p.label}
                                    </span>
                                </button>
                            ))}
                        </div>
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

                    <div className="grid gap-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1 flex justify-between items-center">
                            Attachments
                            <span className="text-[10px] lowercase font-normal opacity-50 italic">Images, Videos, Audio, Docs</span>
                        </Label>
                        <div className="mt-1 space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {files.map((file, i) => (
                                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs group relative pr-8">
                                        {getFileIcon(file.type)}
                                        <span className="max-w-[100px] truncate font-medium">{file.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(i)}
                                            className="absolute right-2 text-gray-500 hover:text-white transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer transition-all text-gray-500 hover:text-indigo-400 group">
                                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                                    <Paperclip className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                    <span className="text-xs font-bold">Attach Files</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-4 pb-2">
                        <Button type="submit" disabled={isLoading || isUploading} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 font-bold transition-all disabled:opacity-50">
                            {(isLoading || isUploading) ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    {isUploading ? 'Uploading Media...' : 'Initializing Task...'}
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-5 w-5" />
                                    Create Task
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent >
        </Dialog >
    );
}
