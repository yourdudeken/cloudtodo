import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { useTaskStore, Task } from '@/store/tasks'; // Import Task from store
import { FileAttachment, TaskComment } from '@/lib/google-drive'; // Import needed types
import {
  Calendar,
  Clock,
  Tag, 
  Battery as Category, 
  Star,
  Pin,
  Flag,
  FileIcon,
  Download,
  Trash2,
  X,
  Users,
  MessageSquare,
  Edit2,
  Send // Added Send icon
} from 'lucide-react';
import { format } from 'date-fns';
import { EditTaskDialog } from './edit-task-dialog';
// CollaborateDialog is no longer needed here
// import { CollaborateDialog } from './collaborate-dialog'; 
import mime from 'mime-types';

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
}

export function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  // Explicitly type the task variable or ensure find returns Task | undefined
  const task: Task | undefined = useTaskStore((state) => state.tasks.find(t => t.id === taskId));
  const addComment = useTaskStore((state) => state.addComment); // Get addComment action
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  // const [showCollaborateDialog, setShowCollaborateDialog] = React.useState(false); // No longer needed
  const deleteAttachment = useTaskStore((state) => state.deleteAttachment);
  const [newComment, setNewComment] = React.useState(''); // State for new comment input

  if (!task) return null;

  const priorityColors: { [key: number]: string } = { // Add index signature
    1: 'text-red-500',
    2: 'text-orange-500',
    3: 'text-blue-500',
    4: 'text-gray-500',
  };

  // Updated getAttachmentIcon to handle potentially missing or non-string mimeType
  const getAttachmentIcon = (mimeType: string | null | undefined) => {
    if (typeof mimeType !== 'string' || !mimeType) {
       return FileIcon; // Default icon if mimeType is missing or not a string
    }
    // Using FileIcon for all for simplicity now, but could be expanded
    if (mimeType.startsWith('image/')) return FileIcon;
    if (mimeType.startsWith('audio/')) return FileIcon;
    if (mimeType.startsWith('text/') || mimeType.includes('document')) return FileIcon;
    return FileIcon;
  };

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[800px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white dark:bg-gray-800 p-6 shadow-lg overflow-y-auto data-[state=open]:animate-contentShow dark:text-gray-200">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold dark:text-white">{task.title}</h2>
                {task.isPinned && <Pin className="h-5 w-5 text-gray-500 dark:text-gray-400" />}
                {task.isStarred && <Star className="h-5 w-5 text-yellow-400 fill-current" />}
              </div>
              {task.description && (
                <p className="text-gray-600 dark:text-gray-300 mt-2">{task.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEditDialog(true)}
                aria-label="Edit Task" // Add aria-label
              >
                <Edit2 className="h-5 w-5" />
              </Button>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close Task Detail"> {/* Add aria-label */}
                  <X className="h-5 w-5" />
                </Button>
              </Dialog.Close>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Due Date & Time */}
              {(task.dueDate || task.dueTime) && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="h-5 w-5" />
                  <div>
                    {task.dueDate && format(new Date(task.dueDate), 'MMMM d, yyyy')} {/* Ensure dueDate is Date object or string */}
                    {task.dueTime && ` at ${task.dueTime}`}
                  </div>
                </div>
              )}

              {/* Reminder */}
              {task.reminder && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="h-5 w-5" />
                  <span>Reminder: {task.reminder} minutes before</span>
                </div>
              )}

              {/* Priority */}
              <div className="flex items-center gap-2">
                <Flag className={`h-5 w-5 ${priorityColors[task.priority]}`} />
                <span className="text-gray-600 dark:text-gray-400">
                  Priority: {
                    task.priority === 1 ? 'Urgent' :
                    task.priority === 2 ? 'High' :
                    task.priority === 3 ? 'Medium' :
                    'Low'
                  }
                </span>
              </div>

              {/* Category & Tags */}
              <div className="space-y-2">
                {task.category && (
                  <div className="flex items-center gap-2">
                    <Category className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-200">
                      {task.category}
                    </span>
                  </div>
                )}
                {task.tags && task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag: string) => ( // Add type annotation for tag
                      <div
                        key={tag}
                        className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-1 rounded"
                      >
                        <Tag className="h-4 w-4" />
                        {tag}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recurrence */}
              {task.recurrence && (
                <div className="text-gray-600 dark:text-gray-400">
                  <h3 className="font-medium mb-2 dark:text-gray-100">Recurrence</h3>
                  <p>
                    Repeats {task.recurrence.frequency}
                    {task.recurrence.interval > 1 && ` every ${task.recurrence.interval} ${task.recurrence.frequency}s`}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Attachments */}
              {task.attachments && task.attachments.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 dark:text-gray-100">Attachments</h3>
                  <div className="space-y-2">
                    {task.attachments.map((attachment: FileAttachment) => { // Add type annotation for attachment
                      // Add safety check before rendering attachment details
                      if (!attachment || !attachment.id || !attachment.name) {
                        console.warn("Skipping rendering attachment due to missing essential data:", attachment);
                        return null;
                      }
                      const Icon = getAttachmentIcon(attachment.mimeType); // Already handles missing mimeType
                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-3 rounded"
                        >
                          <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          <span className="flex-1 truncate">{attachment.name}</span>
                          <div className="flex items-center gap-1">
                            <a
                              href={attachment.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                              aria-label={`Download ${attachment.name}`} // Add aria-label
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => deleteAttachment(task.id, attachment.id)}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-red-500"
                              aria-label={`Delete attachment ${attachment.name}`} // Add aria-label
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div>
                <h3 className="font-medium mb-3 dark:text-gray-100">Comments</h3>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-2 mb-4"> {/* Added max-height and scroll */}
                  {/* Ensure comments exist and is an array before mapping */}
                  {task.comments && Array.isArray(task.comments) && task.comments.length > 0 ? (
                    task.comments.map((comment: TaskComment) => ( // Add type annotation for comment
                      <div key={comment.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          {/* Optionally display user info if available, otherwise just timestamp */}
                          {/* <MessageSquare className="h-4 w-4 text-gray-500 dark:text-gray-400" /> */}
                          {/* <span className="text-sm font-medium dark:text-gray-200">
                            {comment.userEmail || comment.userId || 'User'} 
                          </span> */}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {format(new Date(comment.createdAt), 'MMM d, h:mm a')} {/* Use createdAt */}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300">{comment.content}</p> {/* Use content */}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No comments yet.</p>
                  )}
                </div>
                {/* Add Comment Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="New comment"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (newComment.trim()) {
                        addComment(task.id, newComment.trim());
                        setNewComment(''); // Clear input after adding
                      }
                    }}
                    disabled={!newComment.trim()} // Disable if input is empty
                    aria-label="Add Comment"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* End Comments Section */}
            </div>
          </div>

          {/* Render EditTaskDialog conditionally */}
          {showEditDialog && (
            <EditTaskDialog
              taskId={task.id}
              onClose={() => setShowEditDialog(false)}
            />
          )}
          {/* CollaborateDialog is no longer needed */}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
