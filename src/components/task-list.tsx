import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTaskStore } from '@/store/tasks';
import { Button } from '@/components/ui/button';
import { Circle, CheckCircle2, Calendar, Flag, Plus, Pin, Star, Clock, Tag, Battery as Category, FileIcon, Trash2, Download, Image, Music, FileText, Edit2, MoreVertical } from 'lucide-react';
import { format, subHours } from 'date-fns';
import { useLocation } from '@/lib/hooks';
import { CalendarView } from './calendar-view';
import { KanbanBoard } from './kanban-board';
import { AISuggestions } from './ai-suggestions';
import mime from 'mime-types';
import { EditTaskDialog } from './edit-task-dialog.tsx';

export function TaskList() {
  const tasks = useTaskStore((state) => state.tasks);
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const deleteAttachment = useTaskStore((state) => state.deleteAttachment);
  const { pathname } = useLocation();
  const [taskToEdit, setTaskToEdit] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState<string | null>(null);

  const priorityColors = {
    1: 'text-red-500',
    2: 'text-orange-500',
    3: 'text-blue-500',
    4: 'text-gray-500',
  };

  const getAttachmentIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType.startsWith('text/') || mimeType.includes('document')) return FileText;
    return FileIcon;
  };

  // If we're on the calendar route, render the calendar view
  if (pathname === '/calendar') {
    return <CalendarView />;
  }

  // If we're on the kanban route, render the kanban board
  if (pathname === '/kanban') {
    return <KanbanBoard />;
  }

  const getFilteredTasks = () => {
    switch (pathname) {
      case '/pinned':
        return tasks.filter((task) => task.isPinned);
      case '/starred':
        return tasks.filter((task) => task.isStarred);
      case '/recent':
        const twentyFourHoursAgo = subHours(new Date(), 24);
        return tasks.filter((task) => {
          const taskDate = new Date(task.id);
          return taskDate >= twentyFourHoursAgo;
        }).sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime());
      default:
        return tasks;
    }
  };

  const getViewTitle = () => {
    switch (pathname) {
      case '/pinned':
        return (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Pin className="h-6 w-6 text-gray-700" />
              <h1 className="text-2xl font-semibold">Pinned Tasks</h1>
            </div>
            <AISuggestions />
          </div>
        );
      case '/starred':
        return (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-gray-700" />
              <h1 className="text-2xl font-semibold">Starred Tasks</h1>
            </div>
            <AISuggestions />
          </div>
        );
      case '/recent':
        return (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-gray-700" />
              <h1 className="text-2xl font-semibold">Recent Tasks</h1>
              <span className="text-sm text-gray-500 ml-2">(Last 24 hours)</span>
            </div>
            <AISuggestions />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">All Tasks</h1>
            <AISuggestions />
          </div>
        );
    }
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div className="max-w-4xl mx-auto">
      {getViewTitle()}
      
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            {pathname === '/pinned' && <Pin className="h-12 w-12 mx-auto mb-4" />}
            {pathname === '/starred' && <Star className="h-12 w-12 mx-auto mb-4" />}
            {pathname === '/recent' && <Clock className="h-12 w-12 mx-auto mb-4" />}
            <p className="text-lg">No tasks found</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 bg-white rounded-lg shadow-sm border">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-4 hover:bg-gray-50 group border-b last:border-b-0"
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 mt-1"
                onClick={() => toggleTask(task.id)}
              >
                {task.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </Button>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={task.completed ? 'line-through text-gray-400' : 'font-medium'}>
                    {task.title}
                  </span>
                  {task.isPinned && <Pin className="h-4 w-4 text-gray-500" />}
                  {task.isStarred && <Star className="h-4 w-4 text-yellow-400 fill-current" />}
                </div>
                {task.description && (
                  <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                )}
                
                {/* Attachments */}
                {task.attachments && task.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {task.attachments.map((attachment) => {
                      const Icon = getAttachmentIcon(attachment.mimeType);
                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded"
                        >
                          <Icon className="h-4 w-4 text-gray-500" />
                          <span className="flex-1 truncate">{attachment.name}</span>
                          <div className="flex items-center gap-1">
                            <a
                              href={attachment.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <Download className="h-4 w-4 text-gray-500" />
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
                )}

                {(task.category || task.tags?.length > 0) && (
                  <div className="flex items-center gap-2 mt-2">
                    {task.category && (
                      <div className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
                        <Category className="h-3 w-3" />
                        {task.category}
                      </div>
                    )}
                    {task.tags?.map((tag) => (
                      <div key={tag} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                        <Tag className="h-3 w-3" />
                        {tag}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {task.dueDate && (
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(task.dueDate, 'MMM d')}
                    {task.dueTime && ` at ${task.dueTime}`}
                  </span>
                )}
                <Flag className={`h-4 w-4 ${priorityColors[task.priority]}`} />
                
                {/* Task Actions */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTaskToEdit(task.id)}
                  >
                    <Edit2 className="h-4 w-4 text-gray-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setShowDeleteConfirm(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Task Dialog */}
      {taskToEdit && (
        <EditTaskDialog
          taskId={taskToEdit}
          onClose={() => setTaskToEdit(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
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