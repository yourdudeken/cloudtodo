import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { useTaskStore, Task, UIAttachment } from '@/store/tasks'; // Import Task (TaskData) and UIAttachment
// Removed FileAttachment, TaskComment imports from google-drive
import {
  Calendar,
  Clock,
  Tag,
  Battery as Category,
  Star,
  Pin,
  Flag,
  FileIcon, // Keep for default icon
  Download,
  // Trash2, // Removed Trash2
  X,
  // Users, // Removed Users (CollaborateDialog removed)
  // MessageSquare, // Removed MessageSquare (not used)
  Edit2,
  Send
} from 'lucide-react';
import { format, parseISO } from 'date-fns'; // Import parseISO
import { EditTaskDialog } from './edit-task-dialog';
// Removed CollaborateDialog import

// Define Comment type locally (matching TaskData.comments structure)
interface TaskComment {
    id: string;
    userId: string;
    userEmail: string;
    content: string;
    createdAt: string; // ISO 8601 format
}

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
}

export function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const task: Task | undefined = useTaskStore((state) => state.tasks.find(t => t.id === taskId));
  // Get UI attachments map for this task
  const uiAttachments = useTaskStore((state) => state.uiAttachments[taskId] || []);
  const addComment = useTaskStore((state) => state.addComment);
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  // Removed deleteAttachment call
  // const deleteAttachment = useTaskStore((state) => state.deleteAttachment);
  const [newComment, setNewComment] = React.useState('');

  if (!task || !task.id) return null; // Ensure task and task.id exist

  const priorityColors: { [key: number]: string } = {
    1: 'text-red-500',
    2: 'text-orange-500',
    3: 'text-blue-500',
    4: 'text-gray-500',
  };

  // Simplified icon logic - always use FileIcon for now
  const getAttachmentIcon = (_mimeType: string | null | undefined) => {
    return FileIcon;
  };

  const handleAddComment = () => {
      if (newComment.trim() && task.id) {
          addComment(task.id, newComment.trim());
          setNewComment(''); // Clear input after adding
      }
  };

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[800px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white dark:bg-gray-800 p-6 shadow-lg overflow-y-auto data-[state=open]:animate-contentShow dark:text-gray-200">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {/* Use taskTitle */}
                <h2 className="text-2xl font-semibold dark:text-white">{task.taskTitle}</h2>
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
                aria-label="Edit Task"
              >
                <Edit2 className="h-5 w-5" />
              </Button>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close Task Detail">
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
                    {/* Use parseISO for date string */}
                    {task.dueDate && format(parseISO(task.dueDate), 'MMMM d, yyyy')}
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
                 {/* Handle potentially undefined priority */}
                <Flag className={`h-5 w-5 ${priorityColors[task.priority ?? 4]}`} />
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
                 {/* Use categories array */}
                {task.categories && task.categories.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Category className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    {/* Display first category or map all */}
                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-200">
                      {task.categories[0]}
                    </span>
                  </div>
                )}
                {task.tags && task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag: string) => (
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
              {task.recurrence && task.recurrence !== "None" && (
                <div className="text-gray-600 dark:text-gray-400">
                  <h3 className="font-medium mb-2 dark:text-gray-100">Recurrence</h3>
                   {/* Attempt to parse recurrence string if it's JSON */}
                   {(() => {
                       try {
                           const rec = JSON.parse(task.recurrence!);
                           return (
                               <p>
                                   Repeats {rec.frequency}
                                   {rec.interval > 1 && ` every ${rec.interval} ${rec.frequency}s`}
                                   {rec.endDate && ` until ${format(parseISO(rec.endDate), 'MMM d, yyyy')}`}
                               </p>
                           );
                       } catch (e) {
                           // If parsing fails, display the raw string
                           return <p>Repeats: {task.recurrence}</p>;
                       }
                   })()}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Attachments - Use UIAttachments from store */}
              {uiAttachments.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3 dark:text-gray-100">Attachments</h3>
                  <div className="space-y-2">
                    {uiAttachments.map((attachment: UIAttachment) => {
                      const Icon = getAttachmentIcon(null); // Use default icon for now
                      return (
                        <div
                          key={attachment.driveFileId}
                          className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-3 rounded"
                        >
                          <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          <span className="flex-1 truncate">{attachment.name}</span>
                          <div className="flex items-center gap-1">
                            {/* Use webViewLink if available */}
                            {attachment.webViewLink && (
                                <a
                                  href={attachment.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                  aria-label={`View ${attachment.name}`}
                                >
                                  <Download className="h-4 w-4" /> {/* Using Download icon as placeholder */}
                                </a>
                            )}
                            {/* Remove delete button */}
                            {/* <button ... onClick={() => deleteAttachment(task.id!, attachment.driveFileId)} ...> */}
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
                <div className="space-y-3 max-h-40 overflow-y-auto pr-2 mb-4">
                  {/* Use task.comments array */}
                  {task.comments && Array.isArray(task.comments) && task.comments.length > 0 ? (
                    task.comments.map((comment: TaskComment) => (
                      <div key={comment.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium dark:text-gray-200">
                            {comment.userEmail || 'User'} {/* Display email */}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {format(parseISO(comment.createdAt), 'MMM d, h:mm a')} {/* Use parseISO */}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300">{comment.content}</p>
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
                    onClick={handleAddComment} // Use handler function
                    disabled={!newComment.trim()}
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
          {showEditDialog && task.id && ( // Ensure task.id exists
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
