import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTaskStore, Task } from '@/store/tasks';
import { Button } from '@/components/ui/button';
import { Circle, CheckCircle2, Calendar, Flag, Pin, Star, Edit2, Trash2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { EditTaskDialog } from './edit-task-dialog';

// Define props interface
interface CollaborativeTasksViewProps {
  onTaskClick: (taskId: string) => void;
}

// Destructure props
export function CollaborativeTasksView({ onTaskClick }: CollaborativeTasksViewProps) {
  const tasks = useTaskStore((state) => state.tasks);
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const [taskToEdit, setTaskToEdit] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState<string | null>(null);

  const collaborativeTasks = tasks.filter(task => task.taskType === 'collaborative');

  const priorityColors = {
    1: 'text-red-500',
    2: 'text-orange-500',
    3: 'text-blue-500',
    4: 'text-gray-500',
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-6 w-6 text-gray-700" />
        <h1 className="text-2xl font-semibold">Collaborative Tasks</h1>
      </div>

      {collaborativeTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <Users className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg">No collaborative tasks found</p>
            <p className="text-sm">Tasks marked as 'collaborative' will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
          {collaborativeTasks.map((task) => (
            // Wrap task item in a div with onClick
            <div 
              key={task.id} 
              onClick={() => onTaskClick(task.id)} // Call handler on click
              className="cursor-pointer" // Add cursor pointer
            >
              {/* Inner div structure remains for layout */}
              <div className="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 group border-b dark:border-gray-700 last:border-b-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 mt-1 flex-shrink-0" // Added flex-shrink-0
                  onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }} // Stop propagation
                  aria-label={task.completed ? "Mark task as incomplete" : "Mark task as complete"}
                >
                  {task.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </Button>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`${task.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'font-medium text-gray-900 dark:text-gray-100'}`}>
                    {task.title}
                  </span>
                  {/* Optionally show other icons like Pin/Star if needed */}
                  {task.isPinned && <Pin className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
                  {task.isStarred && <Star className="h-4 w-4 text-yellow-400 fill-current" />}
                </div>
                {task.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>
                )}
                {/* Add other details like category/tags/attachments if needed */}
              </div>

              <div className="flex items-center gap-3">
                {task.dueDate && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(task.dueDate, 'MMM d')}
                    {task.dueTime && ` at ${task.dueTime}`}
                  </span>
                )}
                <Flag className={`h-4 w-4 ${priorityColors[task.priority]} flex-shrink-0`} />
                
                {/* Hover actions */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 flex-shrink-0"> {/* Reduced gap */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); setTaskToEdit(task.id); }} // Stop propagation
                    aria-label="Edit task"
                  >
                    <Edit2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(task.id); }} // Stop propagation
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div> 
          </div> 
          ))}
        </div>
      )}

      {taskToEdit && (
        <EditTaskDialog
          taskId={taskToEdit}
          onClose={() => setTaskToEdit(null)}
        />
      )}

      <Dialog.Root open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Delete Task</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (showDeleteConfirm) {
                    deleteTask(showDeleteConfirm);
                    setShowDeleteConfirm(null);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
