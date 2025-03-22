import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { useTaskStore } from '@/store/tasks';
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
  Edit2
} from 'lucide-react';
import { format } from 'date-fns';
import { EditTaskDialog } from './edit-task-dialog';
import { CollaborateDialog } from './collaborate-dialog';
import mime from 'mime-types';

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
}

export function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const task = useTaskStore((state) => state.tasks.find(t => t.id === taskId));
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [showCollaborateDialog, setShowCollaborateDialog] = React.useState(false);
  const deleteAttachment = useTaskStore((state) => state.deleteAttachment);

  if (!task) return null;

  const priorityColors = {
    1: 'text-red-500',
    2: 'text-orange-500',
    3: 'text-blue-500',
    4: 'text-gray-500',
  };

  const getAttachmentIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return FileIcon;
    if (mimeType.startsWith('audio/')) return FileIcon;
    if (mimeType.startsWith('text/') || mimeType.includes('document')) return FileIcon;
    return FileIcon;
  };

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[800px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg overflow-y-auto">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold">{task.title}</h2>
                {task.isPinned && <Pin className="h-5 w-5 text-gray-500" />}
                {task.isStarred && <Star className="h-5 w-5 text-yellow-400 fill-current" />}
              </div>
              {task.description && (
                <p className="text-gray-600 mt-2">{task.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit2 className="h-5 w-5" />
              </Button>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-5 w-5" />
                </Button>
              </Dialog.Close>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Due Date & Time */}
              {(task.dueDate || task.dueTime) && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-5 w-5" />
                  <div>
                    {task.dueDate && format(task.dueDate, 'MMMM d, yyyy')}
                    {task.dueTime && ` at ${task.dueTime}`}
                  </div>
                </div>
              )}

              {/* Reminder */}
              {task.reminder && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-5 w-5" />
                  <span>Reminder: {task.reminder} minutes before</span>
                </div>
              )}

              {/* Priority */}
              <div className="flex items-center gap-2">
                <Flag className={`h-5 w-5 ${priorityColors[task.priority]}`} />
                <span className="text-gray-600">
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
                    <Category className="h-5 w-5 text-gray-600" />
                    <span className="bg-gray-100 px-2 py-1 rounded text-gray-700">
                      {task.category}
                    </span>
                  </div>
                )}
                {task.tags && task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag) => (
                      <div
                        key={tag}
                        className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded"
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
                <div className="text-gray-600">
                  <h3 className="font-medium mb-2">Recurrence</h3>
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
                  <h3 className="font-medium mb-3">Attachments</h3>
                  <div className="space-y-2">
                    {task.attachments.map((attachment) => {
                      const Icon = getAttachmentIcon(attachment.mimeType);
                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-2 bg-gray-50 p-3 rounded"
                        >
                          <Icon className="h-5 w-5 text-gray-500" />
                          <span className="flex-1 truncate">{attachment.name}</span>
                          <div className="flex items-center gap-1">
                            <a
                              href={attachment.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => deleteAttachment(task.id, attachment.id)}
                              className="p-1 hover:bg-gray-200 rounded text-red-500"
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

              {/* Collaboration */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Collaboration</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCollaborateDialog(true)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </div>
                {task.messages && task.messages.length > 0 ? (
                  <div className="space-y-3">
                    {task.messages.map((message) => (
                      <div key={message.id} className="bg-gray-50 p-3 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">
                            {message.user_id}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(message.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-gray-600">{message.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No comments yet. Click Manage to start collaborating.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {showEditDialog && (
        <EditTaskDialog
          taskId={task.id}
          onClose={() => setShowEditDialog(false)}
        />
      )}

      {showCollaborateDialog && (
        <CollaborateDialog
          taskId={task.id}
          onClose={() => setShowCollaborateDialog(false)}
        />
      )}
    </Dialog.Root>
  );
}