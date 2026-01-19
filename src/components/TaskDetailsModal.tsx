
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
import { Loader2, Upload, File as FileIcon } from 'lucide-react';

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
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">{task.taskTitle}</DialogTitle>
                    <DialogDescription>
                        Created on {new Date(task.createdDate).toLocaleDateString()}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <h4 className="font-medium text-white">Description</h4>
                        <div className="p-3 rounded-lg bg-gray-800 text-sm text-gray-300">
                            {task.description || "No description provided."}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Due Date</span>
                            <p className="text-white">{task.dueDate || "None"}</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Priority</span>
                            <p className="text-white">
                                {task.priority === 1 ? 'High' : task.priority === 2 ? 'Medium' : 'Low'}
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-gray-700 pt-4">
                        <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                            Attachments
                            {isUploading && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
                        </h4>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Documents Section */}
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-400">Documents</Label>
                                <div className="flex flex-col gap-2">
                                    {task.attachments.documents.map((id) => (
                                        <a key={id} href={getAttachmentUrl(id)} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors text-xs text-blue-400 truncate">
                                            <FileIcon className="w-3 h-3 flex-shrink-0" />
                                            File {id.slice(0, 8)}...
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
                                        <Label htmlFor="upload-doc" className="flex items-center justify-center gap-2 w-full p-2 border border-dashed border-gray-600 rounded cursor-pointer hover:bg-gray-800 transition-colors text-xs text-gray-400">
                                            <Upload className="w-3 h-3" /> Add Document
                                        </Label>
                                    </div>
                                </div>
                            </div>

                            {/* Images Section */}
                            <div className="space-y-2">
                                <Label className="text-xs text-gray-400">Images</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {task.attachments.images.map((id) => (
                                        <a key={id} href={getAttachmentUrl(id)} target="_blank" rel="noreferrer" className="block aspect-square rounded bg-gray-800 overflow-hidden hover:opacity-80 transition-opacity">
                                            <img src={`https://drive.google.com/thumbnail?id=${id}`} alt="Attachment" className="w-full h-full object-cover" />
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
                                        <Label htmlFor="upload-img" className="flex flex-col items-center justify-center w-full h-full border border-dashed border-gray-600 rounded cursor-pointer hover:bg-gray-800 transition-colors text-xs text-gray-400">
                                            <Upload className="w-4 h-4 mb-1" /> Add
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
