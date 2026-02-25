import { useState, useEffect } from 'react';
import type { Task, PriorityLevel, Attachments, AttachmentItem } from '@/types';
import { useTasksStore } from '@/store/tasksStore';
import { googleDriveService, SUBFOLDERS } from '@/lib/googleDrive';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Loader2, File as FileIcon, Plus, ArrowRight, Music, Video,
    Edit2, Check, X, Trash2, Paperclip, ImageIcon, Star, Pin,
    Users, Send, UserMinus, User
} from 'lucide-react';

function DriveImage({ fileId, alt }: { fileId: string; alt: string }) {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchImage = async () => {
            try {
                const blob = await googleDriveService.getFileBlob(fileId);
                const objectUrl = URL.createObjectURL(blob);
                if (isMounted) {
                    setUrl(objectUrl);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Failed to fetch image:', error);
                if (isMounted) setLoading(false);
            }
        };

        fetchImage();
        return () => {
            isMounted = false;
            if (url) URL.revokeObjectURL(url);
        };
    }, [fileId]);

    if (loading) return (
        <div className="w-full h-full flex items-center justify-center bg-white/5 animate-pulse rounded-[1.5rem]">
            <ImageIcon className="w-6 h-6 text-gray-700" />
        </div>
    );

    if (!url) return (
        <div className="w-full h-full flex items-center justify-center bg-red-500/5 rounded-[1.5rem] border border-red-500/10">
            <X className="w-6 h-6 text-red-900" />
        </div>
    );

    return <img src={url} alt={alt} className="w-full h-full object-cover" />;
}

interface TaskDetailsModalProps {
    task: Task | null;
    onClose: () => void;
}

export function TaskDetailsModal({ task, onClose }: TaskDetailsModalProps) {
    const { updateTask } = useTasksStore();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form state for editing
    const [editForm, setEditForm] = useState<Partial<Task>>({});
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);

    useEffect(() => {
        if (task) {
            setEditForm(task);
            setNewFiles([]);
            setRemovedAttachmentIds([]);
            setIsEditing(false);
        }
    }, [task]);

    const getAttachmentId = (item: string | AttachmentItem) => typeof item === 'string' ? item : item.id;
    const getAttachmentName = (item: string | AttachmentItem, fallback: string = 'Resource') => {
        if (typeof item === 'string') return `${fallback} ${item.slice(0, 8)}`;
        return item.name || `${fallback} ${item.id.slice(0, 8)}`;
    };

    const [permissions, setPermissions] = useState<any[]>([]);
    const [isSharing, setIsSharing] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');

    useEffect(() => {
        if (task?.googleDriveFileId) {
            fetchPermissions();
        }
    }, [task?.googleDriveFileId]);

    const fetchPermissions = async () => {
        if (!task?.googleDriveFileId) return;
        try {
            const perms = await googleDriveService.getPermissions(task.googleDriveFileId);
            setPermissions(perms || []);
        } catch (error) {
            console.error('Failed to fetch permissions:', error);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail || !task?.googleDriveFileId) return;
        setIsSharing(true);
        try {
            await googleDriveService.shareFile(task.googleDriveFileId, inviteEmail);
            setInviteEmail('');
            await fetchPermissions();
        } catch (error) {
            console.error('Failed to share file:', error);
        } finally {
            setIsSharing(false);
        }
    };

    const handleRemovePermission = async (permId: string) => {
        if (!task?.googleDriveFileId) return;
        try {
            await googleDriveService.removePermission(task.googleDriveFileId, permId);
            await fetchPermissions();
        } catch (error) {
            console.error('Failed to remove permission:', error);
        }
    };

    if (!task) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        setNewFiles(prev => [...prev, ...Array.from(files)]);
    };

    const removeNewFile = (index: number) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingAttachment = (type: keyof Attachments, id: string) => {
        if (!editForm.attachments) return;
        const updated = { ...editForm.attachments };
        updated[type] = (updated[type] as any[]).filter(item => {
            const itemId = typeof item === 'string' ? item : item.id;
            return itemId !== id;
        });
        setEditForm({ ...editForm, attachments: updated });
        setRemovedAttachmentIds(prev => [...prev, id]);
    };

    const togglePin = async () => {
        if (!task) return;
        const updated = { ...task, isPinned: !task.isPinned, updatedDate: new Date().toISOString() };
        await updateTask(updated);
    };

    const toggleStar = async () => {
        if (!task) return;
        const updated = { ...task, isStarred: !task.isStarred, updatedDate: new Date().toISOString() };
        await updateTask(updated);
    };

    const handleDelete = async () => {
        if (!task || !task.googleDriveFileId) return;
        if (window.confirm('Are you sure you want to permanently destroy this task and all its cloud assets?')) {
            await useTasksStore.getState().deleteTask(task.id, task.googleDriveFileId);
            onClose();
        }
    };

    const handleSave = async () => {
        if (!editForm.taskTitle) return;

        setIsSaving(true);
        try {
            const finalAttachments = { ...editForm.attachments } as Attachments;

            // 1. Upload new files
            for (const file of newFiles) {
                let category: keyof typeof SUBFOLDERS = 'DOCUMENTS';
                if (file.type.startsWith('image/')) category = 'PICTURES';
                else if (file.type.startsWith('video/')) category = 'VIDEOS';
                else if (file.type.startsWith('audio/')) category = 'AUDIOS';

                const uploaded = await googleDriveService.uploadAttachment(file, category);
                const item: AttachmentItem = { id: uploaded.id, name: uploaded.name, mimeType: uploaded.mimeType };

                if (category === 'PICTURES') finalAttachments.images.push(item);
                else if (category === 'VIDEOS') finalAttachments.videos.push(item);
                else if (category === 'AUDIOS') finalAttachments.audio.push(item);
                else finalAttachments.documents.push(item);
            }

            // 2. Cleanup removed attachments from Drive
            for (const id of removedAttachmentIds) {
                try {
                    await googleDriveService.deleteTask(id);
                } catch (e) {
                    console.error(`Failed to cleanup Drive file ${id}`, e);
                }
            }

            // 3. Update task
            await updateTask({
                ...task,
                ...editForm,
                attachments: finalAttachments,
                updatedDate: new Date().toISOString()
            } as Task);

            setIsEditing(false);
            setNewFiles([]);
            setRemovedAttachmentIds([]);
        } catch (error) {
            console.error('Failed to save task:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const getAttachmentUrl = (fileId: string) => {
        return `https://drive.google.com/file/d/${fileId}/view`;
    };

    return (
        <Dialog open={!!task} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto bg-black border-white/10 text-white rounded-[2.5rem] shadow-2xl p-0 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>

                <div className="p-10">
                    <DialogHeader className="mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {isEditing ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { val: 1, label: 'High', color: 'bg-red-500' },
                                            { val: 2, label: 'Med', color: 'bg-orange-500' },
                                            { val: 3, label: 'Low', color: 'bg-indigo-500' }
                                        ].map((p) => (
                                            <button
                                                key={p.val}
                                                onClick={() => setEditForm({ ...editForm, priority: p.val as PriorityLevel })}
                                                className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all ${editForm.priority === p.val ? `${p.color}/20 border-${p.color.split('-')[1]}-500/50 text-white` : 'border-white/5 text-gray-500'}`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${task.priority === 1 ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                        task.priority === 2 ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                            'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                        }`}>
                                        {task.priority === 1 ? 'High Priority' : task.priority === 2 ? 'Normal Priority' : 'Low Priority'}
                                    </span>
                                )}
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                    {task.taskType.isPersonal ? (
                                        <>
                                            <User className="w-3 h-3 text-gray-500" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Solo Mission</span>
                                        </>
                                    ) : (
                                        <>
                                            <Users className="w-3 h-3 text-indigo-400" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Team Effort</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={togglePin}
                                    className={`p-2.5 rounded-full border transition-all ${task.isPinned ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
                                >
                                    <Pin className={`w-4 h-4 ${task.isPinned ? 'fill-blue-400' : ''}`} />
                                </button>
                                <button
                                    onClick={toggleStar}
                                    className={`p-2.5 rounded-full border transition-all ${task.isStarred ? 'bg-yellow-600/20 border-yellow-500/50 text-yellow-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
                                >
                                    <Star className={`w-4 h-4 ${task.isStarred ? 'fill-yellow-400' : ''}`} />
                                </button>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`p-2.5 rounded-full border transition-all ${isEditing ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-600/30' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                                >
                                    {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {isEditing ? (
                            <div className="mt-6 space-y-4">
                                <Input
                                    value={editForm.taskTitle}
                                    onChange={(e) => setEditForm({ ...editForm, taskTitle: e.target.value })}
                                    className="text-3xl font-black bg-white/5 border-white/10 h-16 rounded-2xl px-6 focus:ring-indigo-500/40"
                                    placeholder="Task Title"
                                />
                                <div className="flex gap-4">
                                    <Input
                                        type="date"
                                        value={editForm.dueDate}
                                        onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                                        className="bg-white/5 border-white/10 rounded-xl"
                                    />
                                    <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                                        className="bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    >
                                        <option value="todo">To Do</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mr-2">Type:</Label>
                                        <button
                                            onClick={() => setEditForm({ ...editForm, taskType: { ...editForm.taskType!, isPersonal: true, isCollaborative: false } })}
                                            className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md transition-all ${editForm.taskType?.isPersonal ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            Personal
                                        </button>
                                        <button
                                            onClick={() => setEditForm({ ...editForm, taskType: { ...editForm.taskType!, isPersonal: false, isCollaborative: true } })}
                                            className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md transition-all ${editForm.taskType?.isCollaborative ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            Collab
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <DialogTitle className="text-4xl font-black mt-6 tracking-tight leading-tight">{task.taskTitle}</DialogTitle>
                                <DialogDescription className="text-gray-500 font-medium mt-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    Cloud Host: Google Drive • Modified {new Date(task.updatedDate).toLocaleDateString()}
                                </DialogDescription>
                            </>
                        )}
                    </DialogHeader>

                    <div className="grid gap-12 py-4">
                        <div className="grid gap-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                Context & Mission
                            </h4>
                            {isEditing ? (
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full min-h-[150px] p-6 rounded-[1.5rem] bg-white/[0.03] border border-white/5 text-base text-gray-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                                    placeholder="Describe your goals..."
                                />
                            ) : (
                                <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 text-lg text-gray-400 leading-relaxed shadow-inner">
                                    {task.description || "No specific mission parameters set for this task."}
                                </div>
                            )}
                        </div>

                        {task.taskType.isCollaborative && (
                            <div className="grid gap-4 mt-8 animate-in slide-in-from-bottom-2 duration-500">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 flex items-center gap-2">
                                    <Users className="w-3 h-3" />
                                    Collaborative Sync
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-3">
                                        {permissions.map((perm) => (
                                            <div key={perm.id} className="flex items-center gap-3 px-4 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-[1rem] group transition-all hover:border-indigo-500/30">
                                                <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center font-black text-indigo-400 border border-indigo-500/20 text-xs">
                                                    {perm.emailAddress?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-white max-w-[200px] truncate">{perm.emailAddress}</span>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">{perm.role}</span>
                                                </div>
                                                {perm.role !== 'owner' && (
                                                    <button
                                                        onClick={() => handleRemovePermission(perm.id)}
                                                        className="ml-2 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <UserMinus className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {isEditing && (
                                        <div className="flex gap-2 max-w-md animate-in fade-in duration-300">
                                            <Input
                                                type="email"
                                                placeholder="Invite by email..."
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                className="bg-white/5 border-white/10 h-11 rounded-xl text-sm"
                                            />
                                            <Button
                                                onClick={handleInvite}
                                                disabled={isSharing || !inviteEmail}
                                                className="bg-indigo-600 hover:bg-indigo-700 h-11 px-5 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                                            >
                                                {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="border-t border-white/5 pt-12">
                            <div className="flex items-center justify-between mb-8">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 flex items-center gap-2">
                                    <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                                    Integrated Assets
                                    {isSaving && <Loader2 className="w-4 h-4 animate-spin text-indigo-400 ml-2" />}
                                </h4>
                                {isEditing && (
                                    <label className="flex items-center gap-2 px-6 py-2 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-indigo-600/20 transition-all">
                                        <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                                        <Plus className="w-3.5 h-3.5" /> Attach New
                                    </label>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Visual Section */}
                                <div className="space-y-6">
                                    <Label className="text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-50">Visual Assets</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Existing Images */}
                                        {editForm.attachments?.images.map((item) => {
                                            const id = getAttachmentId(item);
                                            const name = getAttachmentName(item, 'Image');
                                            return (
                                                <div key={id} className="relative group">
                                                    <a href={getAttachmentUrl(id)} target="_blank" rel="noreferrer" className="block aspect-square rounded-[1.5rem] bg-white/[0.03] border border-white/5 overflow-hidden hover:opacity-80 transition-all">
                                                        <DriveImage fileId={id} alt={name} />
                                                    </a>
                                                    {isEditing && (
                                                        <button
                                                            onClick={() => removeExistingAttachment('images', id)}
                                                            className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform z-10"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* New Images */}
                                        {newFiles.filter(f => f.type.startsWith('image/')).map((file, i) => (
                                            <div key={i} className="relative group opacity-60">
                                                <div className="aspect-square rounded-[1.5rem] bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center p-4 text-center">
                                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mb-2" />
                                                    <span className="text-[8px] font-bold truncate w-full">{file.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => removeNewFile(newFiles.indexOf(file))}
                                                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Doc/Audio/Video Sections (Simplified for brevity but functional) */}
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-50">Documentation & Media</Label>
                                        <div className="flex flex-col gap-3">
                                            {/* Existing Misc */}
                                            {editForm.attachments && [...editForm.attachments.documents, ...editForm.attachments.audio, ...editForm.attachments.videos].map((item) => {
                                                const id = getAttachmentId(item);
                                                const name = getAttachmentName(item);
                                                const isDoc = (editForm.attachments?.documents as any[]).some(i => (typeof i === 'string' ? i : i.id) === id);
                                                const isAudio = (editForm.attachments?.audio as any[]).some(i => (typeof i === 'string' ? i : i.id) === id);

                                                return (
                                                    <div key={id} className="relative group">
                                                        <a href={getAttachmentUrl(id)} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all text-sm text-indigo-400 group">
                                                            {isAudio ? <Music className="w-4 h-4 flex-shrink-0" /> : isDoc ? <FileIcon className="w-4 h-4 flex-shrink-0" /> : <Video className="w-4 h-4 flex-shrink-0" />}
                                                            <span className="font-bold truncate">{name}</span>
                                                            <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </a>
                                                        {isEditing && (
                                                            <button
                                                                onClick={() => {
                                                                    const type = isDoc ? 'documents' : isAudio ? 'audio' : 'videos';
                                                                    removeExistingAttachment(type as any, id);
                                                                }}
                                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg z-10"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* New Misc */}
                                            {newFiles.filter(f => !f.type.startsWith('image/')).map((file, i) => (
                                                <div key={i} className="relative flex items-center gap-3 p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 opacity-60">
                                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                                                    <span className="text-xs font-bold truncate flex-1">{file.name}</span>
                                                    <button
                                                        onClick={() => removeNewFile(newFiles.indexOf(file))}
                                                        className="text-red-400 hover:text-red-300 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-16 pb-10">
                        <div className="flex gap-4">
                            {isEditing ? (
                                <>
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="rounded-2xl bg-white text-black hover:bg-gray-200 px-10 h-14 font-black text-sm uppercase tracking-widest shadow-xl shadow-white/5 transition-all"
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5 mr-3" />}
                                        Securely Save
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditForm(task);
                                            setNewFiles([]);
                                            setRemovedAttachmentIds([]);
                                        }}
                                        className="rounded-2xl border border-white/5 text-gray-500 hover:text-white hover:bg-white/5 px-8 h-14 font-bold uppercase tracking-widest"
                                    >
                                        Abort
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="ghost"
                                        onClick={onClose}
                                        className="rounded-2xl border border-white/5 text-gray-500 hover:text-white hover:bg-white/5 px-10 h-14 font-bold uppercase tracking-widest transition-all"
                                    >
                                        Exit Overview
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={handleDelete}
                                        disabled={isSaving}
                                        className="rounded-2xl border border-red-500/20 text-red-500/50 hover:text-red-500 hover:bg-red-500/5 px-10 h-14 font-bold uppercase tracking-widest transition-all"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Destroy Task
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
