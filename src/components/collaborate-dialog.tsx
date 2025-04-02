import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { useTaskStore } from '@/store/tasks';
import { useAuthStore } from '@/store/auth';
import { Users, Send, X } from 'lucide-react';
import { format } from 'date-fns';

interface CollaborateDialogProps {
  taskId: string;
  onClose: () => void;
}

export function CollaborateDialog({ taskId, onClose }: CollaborateDialogProps) {
  const [newComment, setNewComment] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  
  const { user } = useAuthStore();
  const { tasks, addComment } = useTaskStore();
  const task = tasks.find(t => t.id === taskId);

  if (!task || !user) return null;

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await addComment(taskId, newComment);
      setNewComment('');
    } catch (error) {
      setError('Failed to add comment');
    }
  };

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-500" />
              Task Collaboration
            </h2>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mb-6">
            <h3 className="font-medium mb-2">Task Details</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium">{task.taskTitle}</h4>
              {task.description && (
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div>
            <h3 className="font-medium mb-3">Comments</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-[200px] overflow-y-auto">
              {task.comments?.length === 0 ? (
                <p className="text-gray-500 text-center">No comments yet</p>
              ) : (
                task.comments?.map((comment) => (
                  <div key={comment.id} className="mb-4 last:mb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{comment.userEmail}</span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button type="submit" disabled={!newComment.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {error && (
              <div className="mt-2 text-sm text-red-500">
                {error}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
