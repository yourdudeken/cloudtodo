import /*React,*/ { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
// Import Task type (aliased TaskData)
import { useTaskStore, /*Task*/ } from '@/store/tasks';
import { Button } from '@/components/ui/button';
// Remove unused icons
import { Circle, CheckCircle2, Calendar, Flag, /*Plus,*/ Pin, Star, Clock, Tag, Battery as Category, /*FileIcon,*/ Trash2, Edit2, /*MoreVertical,*/ Sparkles, Loader2 } from 'lucide-react';
import { format, subHours, parseISO } from 'date-fns'; // Import parseISO
import { useLocation } from '@/lib/hooks';
import { CalendarView } from './calendar-view';
import { KanbanBoard } from './kanban-board';
//import { AISuggestions } from './ai-suggestions';
import { SearchBar } from './search-bar';
import { EditTaskDialog } from './edit-task-dialog';
import { CollaborativeTasksView } from './collaborative-tasks-view'; // Import CollaborativeTasksView

// Define props interface
interface TaskListProps {
  onTaskClick: (taskId: string) => void;
}

// Destructure props
export function TaskList({ onTaskClick }: TaskListProps) {
  const { tasks } = useTaskStore((state) => ({ tasks: state.tasks }));
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  // Removed deleteAttachment
  const { pathname } = useLocation();
  const [taskToEdit, setTaskToEdit] = useState<{ id: string; aiSuggestion?: string } | null>(null);
  const [showTaskDeleteConfirm, setShowTaskDeleteConfirm] = useState<string | null>(null);
  // Removed attachment delete state
  const [aiLoadingTaskId, setAiLoadingTaskId] = useState<string | null>(null);
  const [aiErrorTaskId, setAiErrorTaskId] = useState<string | null>(null);

  const priorityColors = {
    1: 'text-red-500',
    2: 'text-orange-500',
    3: 'text-blue-500',
    4: 'text-gray-500',
  };

  // Removed getAttachmentIcon

  if (pathname === '/calendar') {
    return <CalendarView />;
  }

  if (pathname === '/kanban') {
    return <KanbanBoard onTaskClick={onTaskClick} />;
  }

  if (pathname === '/collaborate') {
    return <CollaborativeTasksView onTaskClick={onTaskClick} />;
  }

  const handleAISuggestion = async (taskId: string, title: string, description: string | undefined) => {
    setAiLoadingTaskId(taskId);
    setAiErrorTaskId(null);
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey || apiKey === 'PASTE_YOUR_OPENROUTER_KEY_HERE') {
      console.error("OpenRouter API key not found or not set in environment variables.");
      setAiErrorTaskId(taskId);
      setAiLoadingTaskId(null);
      return;
    }

    const prompt = `Improve the following task:\nTitle: ${title}\nDescription: ${description || 'No description provided.'}\n\nProvide only the improved description as plain text, without any introductory phrases like "Here's the improved description:".`;

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "model": "deepseek/deepseek-chat-v3-0324:free",
          "messages": [
            { "role": "system", "content": "You are an assistant that helps improve task descriptions. Provide only the improved description text." },
            { "role": "user", "content": prompt }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenRouter API Error:', errorData);
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const suggestion = data.choices?.[0]?.message?.content?.trim();

      if (suggestion) {
        setTaskToEdit({ id: taskId, aiSuggestion: suggestion });
      } else {
        console.error('No suggestion received from AI.');
        setAiErrorTaskId(taskId);
      }

    } catch (error) {
      console.error('Error fetching AI suggestion:', error);
      setAiErrorTaskId(taskId);
    } finally {
      setAiLoadingTaskId(null);
    }
  };


  const getFilteredTasks = () => {
    switch (pathname) {
      case '/pinned':
        return tasks.filter((task) => task.isPinned);
      case '/starred':
        return tasks.filter((task) => task.isStarred);
      case '/recent':
        const twentyFourHoursAgo = subHours(new Date(), 24);
        return tasks.filter((task) => {
          if (!task.createdDate || typeof task.createdDate !== 'string') {
            return false;
          }
          try {
            const taskCreationDate = parseISO(task.createdDate); // Use imported parseISO
            return taskCreationDate >= twentyFourHoursAgo;
          } catch (e) {
            console.error(`Error parsing createdDate for task ${task.id}: ${task.createdDate}`, e);
            return false;
          }
        }).sort((a, b) => {
            const dateA = a.createdDate ? parseISO(a.createdDate).getTime() : 0; // Use imported parseISO
            const dateB = b.createdDate ? parseISO(b.createdDate).getTime() : 0; // Use imported parseISO
            return dateB - dateA;
        });
      default:
        // Default sort: use createdDate string, newest first
        return [...tasks].sort((a, b) => {
            const dateA = a.createdDate ? parseISO(a.createdDate).getTime() : 0; // Use imported parseISO
            const dateB = b.createdDate ? parseISO(b.createdDate).getTime() : 0; // Use imported parseISO
            return dateB - dateA;
        });
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
          </div>
        );
      case '/starred':
        return (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-gray-700" />
              <h1 className="text-2xl font-semibold">Starred Tasks</h1>
            </div>
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
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">All Tasks</h1>
          </div>
        );
    }
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div className="max-w-4xl mx-auto">
      {getViewTitle()}

      <SearchBar />

      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            {pathname === '/pinned' && <Pin className="h-12 w-12 mx-auto mb-4" />}
            {pathname === '/starred' && <Star className="h-12 w-12 mx-auto mb-4" />}
            {pathname === '/recent' && <Clock className="h-12 w-12 mx-auto mb-4" />}
            <p className="text-lg">No tasks found in this view</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
          {filteredTasks.map((task, index) => (
            <div
              key={task.id || index} // Use index as fallback key
              onClick={() => task.id && onTaskClick(task.id)} // Check task.id exists
              className="cursor-pointer"
            >
              <div className="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 group border-b dark:border-gray-700 last:border-b-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 mt-1 flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); task.id && toggleTask(task.id); }} // Check task.id
                  aria-label={task.status === 'completed' ? "Mark task as incomplete" : "Mark task as complete"}
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </Button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`truncate ${task.status === 'completed' ? 'line-through text-gray-400 dark:text-gray-500' : 'font-medium text-gray-900 dark:text-gray-100'}`}>
                      {task.taskTitle} {/* Use taskTitle */}
                    </span>
                    {task.isPinned && <Pin className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />}
                    {task.isStarred && <Star className="h-4 w-4 text-yellow-400 fill-current flex-shrink-0" />}
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{task.description}</p>
                  )}

                  {/* Removed old attachment rendering logic */}

                  {/* Use task.categories */}
                  {/* Corrected: Add parentheses for mixed operators */}
                  {((task.categories?.length ?? 0) > 0 || (task.tags?.length ?? 0) > 0) && (
                    <div className="flex items-center flex-wrap gap-2 mt-2">
                      {task.categories?.[0] && ( // Display first category
                        <div className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                          <Category className="h-3 w-3" />
                          {task.categories[0]}
                        </div>
                      )}
                      {task.tags?.map((tag) => (
                        <div key={tag} className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                          <Tag className="h-3 w-3" />
                          {tag}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right side elements */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {task.dueDate && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 whitespace-nowrap">
                      <Calendar className="h-4 w-4" />
                      {/* Corrected: Use imported parseISO */}
                      {format(parseISO(task.dueDate), 'MMM d')}
                      {task.dueTime && ` at ${task.dueTime}`}
                    </span>
                  )}
                  {/* Corrected: Handle priority indexing */}
                  <Flag className={`h-4 w-4 ${priorityColors[(task.priority ?? 4) as keyof typeof priorityColors]}`} />

                  {/* Hover actions */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        task.id && task.taskTitle && handleAISuggestion(task.id, task.taskTitle, task.description);
                      }}
                      aria-label="Get AI Suggestion"
                      disabled={aiLoadingTaskId === task.id || !task.id || !task.taskTitle}
                    >
                      {aiLoadingTaskId === task.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      ) : aiErrorTaskId === task.id ? (
                        <Sparkles className="h-4 w-4 text-red-500" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                      )}
                    </Button>
                     <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); task.id && setTaskToEdit({ id: task.id }); }} // Check task.id
                      aria-label="Edit task"
                    >
                      <Edit2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={(e) => { e.stopPropagation(); task.id && setShowTaskDeleteConfirm(task.id); }} // Check task.id
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
          taskId={taskToEdit.id!} // Use non-null assertion as taskToEdit ensures id exists
          initialSuggestion={taskToEdit.aiSuggestion}
          onClose={() => setTaskToEdit(null)}
        />
      )}

      {/* Task Deletion Dialog */}
      <Dialog.Root open={!!showTaskDeleteConfirm} onOpenChange={() => setShowTaskDeleteConfirm(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Delete Task</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowTaskDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (showTaskDeleteConfirm) {
                    deleteTask(showTaskDeleteConfirm);
                    setShowTaskDeleteConfirm(null);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Removed Attachment Deletion Dialog */}

    </div>
  );
}
