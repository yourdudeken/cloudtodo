
import { useState } from 'react';
import type { Task } from '@/types';
import { useTasksStore } from '@/store/tasksStore';
import { googleDriveService } from '@/lib/googleDrive';
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
import { Loader2, Upload, File as FileIcon, Plus, ArrowRight } from 'lucide-react';

interface TaskDetailsModalProps {
    task: Task | null;
    onClose: () => void;
}

export function TaskDetailsModal({ task, onClose }: TaskDetailsModalProps) {
    const { updateTask } = useTasksStore();
    const [isUploading, setIsUploading] = useState(false);

    if (!task) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'audio' | 'images' | 'documents' | 'videos') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // We need to map the type to the SUBFOLDERS key
            // SUBFOLDERS keys: AUDIOS, VIDEOS, DOCUMENTS, PICTURES
            let folderKey: 'AUDIOS' | 'VIDEOS' | 'DOCUMENTS' | 'PICTURES' = 'DOCUMENTS';
            if (type === 'audio') folderKey = 'AUDIOS';
            if (type === 'videos') folderKey = 'VIDEOS';
            if (type === 'images') folderKey = 'PICTURES';

            const uploadedFile = await googleDriveService.uploadAttachment(file, folderKey);

            const newAttachments = { ...task.attachments };
            // webViewLink is the viewable link, webContentLink is download link
            // We will store the file ID effectively, or maybe the link. 
            // The Type definition says string[]. Let's store the ID for now, or the link. 
            // Storing ID is safer if we want to delete later.
            newAttachments[type] = [...newAttachments[type], uploadedFile.id];

            await updateTask({
                ...task,
                attachments: newAttachments,
                updatedDate: new Date().toISOString()
            });

        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const getAttachmentUrl = (fileId: string) => {
        // Logic to resolve fileId to a viewable URL would go here, 
        // typically strictly using the drive viewer based on ID:
        return `https://drive.google.com/file/d/${fileId}/view`;
    }

    return (
        <Dialog open={!!task} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-black border-white/10 text-white rounded-[2.5rem] shadow-2xl p-0 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>

                <div className="p-10">
                    <DialogHeader className="mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${task.priority === 1 ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                    task.priority === 2 ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                        'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                    }`}>
                                    {task.priority === 1 ? 'High Priority' : task.priority === 2 ? 'Normal Priority' : 'Low Priority'}
                                </span>
                            </div>
                        </div>
                        <DialogTitle className="text-3xl font-black mt-4 tracking-tight leading-tight">{task.taskTitle}</DialogTitle>
                        <DialogDescription className="text-gray-500 font-medium">
                            Synced from Google Drive • Last modified {new Date(task.updatedDate).toLocaleDateString()}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-10 py-4">
                        <div className="grid gap-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                Description
                            </h4>
                            <div className="p-6 rounded-[1.5rem] bg-white/[0.03] border border-white/5 text-base text-gray-400 leading-relaxed shadow-inner">
                                {task.description || "No additional context provided for this task."}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 p-6 rounded-[1.5rem] bg-indigo-500/[0.02] border border-indigo-500/10">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black underline decoration-indigo-500/50 underline-offset-4 text-gray-500 uppercase tracking-[0.2em]">Target Date</span>
                                <p className="text-white font-bold text-lg">{task.dueDate || "Not Set"}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black underline decoration-indigo-500/50 underline-offset-4 text-gray-500 uppercase tracking-[0.2em]">Current Status</span>
                                <p className="text-white font-bold text-lg flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    {task.status.toUpperCase()}
                                </p>
                            </div>
                        </div>

                        <div className="border-t border-white/5 pt-10">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-6 flex items-center gap-2">
                                <Plus className="w-3 h-3" />
                                Resource Attachments
                                {isUploading && <Loader2 className="w-4 h-4 animate-spin text-indigo-400 ml-2" />}
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Documents Section */}
                                <div className="space-y-4">
                                    <Label className="text-xs font-bold text-gray-400 ml-1">Documentation</Label>
                                    <div className="flex flex-col gap-3">
                                        {task.attachments.documents.map((id) => (
                                            <a key={id} href={getAttachmentUrl(id)} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all text-sm text-indigo-400 truncate group shadow-sm">
                                                <FileIcon className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                                <span className="font-medium">Document {id.slice(0, 6)}</span>
                                                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        ))}
                                        <div className="relative">
                                            <Input
                                                type="file"
                                                id="upload-doc"
                                                className="hidden"
                                                onChange={(e) => handleFileUpload(e, 'documents')}
                                                disabled={isUploading}
                                            />
                                            <Label htmlFor="upload-doc" className="flex items-center justify-center gap-2 w-full p-4 border border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-white/[0.02] hover:border-indigo-500/30 transition-all text-xs font-bold text-gray-500">
                                                <Upload className="w-4 h-4" /> Add Asset
                                            </Label>
                                        </div>
                                    </div>
                                </div>

                                {/* Images Section */}
                                <div className="space-y-4">
                                    <Label className="text-xs font-bold text-gray-400 ml-1">Visual Items</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {task.attachments.images.map((id) => (
                                            <a key={id} href={getAttachmentUrl(id)} target="_blank" rel="noreferrer" className="block aspect-square rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden hover:opacity-80 transition-all group relative">
                                                <img src={`https://drive.google.com/thumbnail?id=${id}`} alt="Attachment" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <ArrowRight className="w-6 h-6 text-white transform rotate-[-45deg]" />
                                                </div>
                                            </a>
                                        ))}
                                        <div className="relative aspect-square">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                id="upload-img"
                                                className="hidden"
                                                onChange={(e) => handleFileUpload(e, 'images')}
                                                disabled={isUploading}
                                            />
                                            <Label htmlFor="upload-img" className="flex flex-col items-center justify-center w-full h-full border border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-white/[0.02] hover:border-indigo-500/30 transition-all text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                <Upload className="w-5 h-5 mb-2 text-indigo-500/50" />
                                                Import
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-12">
                        <Button variant="ghost" onClick={onClose} className="rounded-xl border border-white/5 hover:bg-white/5 text-gray-400 hover:text-white px-8 h-12 font-bold">
                            Dismiss
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
