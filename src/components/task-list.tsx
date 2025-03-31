import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTaskStore } from '@/store/tasks';
import { Button } from '@/components/ui/button';
import { Circle, CheckCircle2, Calendar, Flag, Plus, Pin, Star, Clock, Tag, Battery as Category, FileIcon, Trash2, Download, Image, Music, FileText, Edit2, MoreVertical, Sparkles, Loader2 } from 'lucide-react'; // Added Sparkles, Loader2
import { format, subHours } from 'date-fns';
import { useLocation } from '@/lib/hooks';
import { CalendarView } from './calendar-view';
import { KanbanBoard } from './kanban-board';
import { AISuggestions } from './ai-suggestions';
import { SearchBar } from './search-bar';
import { EditTaskDialog } from './edit-task-dialog';
import { CollaborativeTasksView } from './collaborative-tasks-view'; // Import CollaborativeTasksView
// mime import seems unused here, can be removed if not needed elsewhere in the file
// import mime from 'mime-types';

// Define props interface
interface TaskListProps {
  onTaskClick: (taskId: string) => void; 
}

// Destructure props
export function TaskList({ onTaskClick }: TaskListProps) { 
  const tasks = useTaskStore((state) => state.tasks);
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const deleteAttachment = useTaskStore((state) => state.deleteAttachment);
  const { pathname } = useLocation();
  const [taskToEdit, setTaskToEdit] = useState<{ id: string; aiSuggestion?: string } | null>(null); // Store suggestion with ID
  const [showTaskDeleteConfirm, setShowTaskDeleteConfirm] = useState<string | null>(null); // Renamed state
  // State for attachment delete confirmation
  const [attachmentToDelete, setAttachmentToDelete] = useState<{ taskId: string; attachmentId: string; attachmentName: string } | null>(null);
  // State for AI suggestions
  const [aiLoadingTaskId, setAiLoadingTaskId] = useState<string | null>(null);
  const [aiErrorTaskId, setAiErrorTaskId] = useState<string | null>(null);

  const priorityColors = {
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
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType.startsWith('text/') || mimeType.includes('document')) return FileText;
    return FileIcon;
  };

  if (pathname === '/calendar') {
    // Assuming CalendarView doesn't need onTaskClick for now
    return <CalendarView />; 
  }

  if (pathname === '/kanban') {
    // Pass onTaskClick to KanbanBoard
    return <KanbanBoard onTaskClick={onTaskClick} />;
  }

  // Pass onTaskClick down to CollaborativeTasksView
  if (pathname === '/collaborate') {
    return <CollaborativeTasksView onTaskClick={onTaskClick} />;
  }

  const handleAISuggestion = async (taskId: string, title: string, description: string | undefined) => {
    setAiLoadingTaskId(taskId);
    setAiErrorTaskId(null);
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error("OpenRouter API key not found in environment variables.");
      setAiErrorTaskId(taskId);
      setAiLoadingTaskId(null);
      // Optionally show a user-facing error message here
      return;
    }

    const prompt = `Improve the following task:\nTitle: ${title}\nDescription: ${description || 'No description provided.'}\n\nProvide only the improved description as plain text, without any introductory phrases like "Here's the improved description:".`;

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          // Optional headers for OpenRouter ranking:
          // "HTTP-Referer": window.location.href, 
          // "X-Title": document.title, 
        },
        body: JSON.stringify({
          "model": "deepseek/deepseek-chat-v3-0324:free", // Using the specified free model
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
        // Open the edit dialog with the suggestion
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
        const twentyFourHoursAgoTimestamp = subHours(new Date(), 24).getTime(); 
        return tasks.filter((task) => {
          return typeof task.createdAt === 'number' && task.createdAt >= twentyFourHoursAgoTimestamp;
        }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); 
      default:
        return [...tasks].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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
            {/* <AISuggestions /> Removed */}
          </div>
        );
      case '/starred':
        return (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-gray-700" />
              <h1 className="text-2xl font-semibold">Starred Tasks</h1>
            </div>
            {/* <AISuggestions /> Removed */}
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
            {/* <AISuggestions /> Removed */}
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">All Tasks</h1>
            {/* <AISuggestions /> Removed */}
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
            <p className="text-lg">No tasks found</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
          {filteredTasks.map((task) => (
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
                
                <div className="flex-1 min-w-0"> {/* Added min-w-0 for better truncation */}
                  <div className="flex items-center gap-2">
                    <span className={`truncate ${task.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'font-medium text-gray-900 dark:text-gray-100'}`}>
                      {task.title}
                    </span>
                    {task.isPinned && <Pin className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />}
                    {task.isStarred && <Star className="h-4 w-4 text-yellow-400 fill-current flex-shrink-0" />}
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{task.description}</p> // Added truncate
                  )}
                  
                  {/* Add check for attachment existence before mapping */}
                  {task.attachments && task.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {task.attachments.map((attachment, index) => { // Add index for logging
                        // Log the attachment object just before potential error
                        console.log(`TaskList Rendering Attachment ${index + 1} for Task ${task.id}:`, JSON.stringify(attachment));

                        // Add extra safety check for attachment object and mimeType before rendering
                        if (!attachment || typeof attachment.mimeType === 'undefined' || attachment.mimeType === null) {
                           console.warn(`TaskList: Skipping rendering attachment due to missing data (ID: ${attachment?.id}, Name: ${attachment?.name})`);
                           return null; // Skip rendering this attachment if data is incomplete
                        }
                        // Log the mimeType specifically
                        console.log(`TaskList Attachment ${index + 1} mimeType:`, attachment.mimeType);
                        const Icon = getAttachmentIcon(attachment.mimeType);
                        return (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded"
                          >
                            <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                            <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{attachment.name}</span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <a
                                href={attachment.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                onClick={(e) => e.stopPropagation()} // Stop propagation
                              >
                                <Download className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              </a>
                              {/* Update button onClick to show confirmation */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAttachmentToDelete({ taskId: task.id, attachmentId: attachment.id, attachmentName: attachment.name });
                                }}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-red-500 dark:text-red-400"
                                aria-label={`Delete attachment ${attachment.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(task.category || (task.tags?.length ?? 0) > 0) && ( 
                    <div className="flex items-center flex-wrap gap-2 mt-2"> {/* Added flex-wrap */}
                      {task.category && (
                        <div className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                          <Category className="h-3 w-3" />
                          {task.category}
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
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 whitespace-nowrap"> {/* Added whitespace-nowrap */}
                      <Calendar className="h-4 w-4" />
                      {format(task.dueDate, 'MMM d')}
                      {task.dueTime && ` at ${task.dueTime}`}
                    </span>
                  )}
                  <Flag className={`h-4 w-4 ${priorityColors[task.priority]}`} />
                  
                  {/* Hover actions */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1"> {/* Reduced gap */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleAISuggestion(task.id, task.title, task.description); 
                      }}
                      aria-label="Get AI Suggestion"
                      disabled={aiLoadingTaskId === task.id} // Disable while loading
                    >
                      {aiLoadingTaskId === task.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      ) : aiErrorTaskId === task.id ? (
                        <Sparkles className="h-4 w-4 text-red-500" /> // Indicate error
                      ) : (
                        <Sparkles className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                      )}
                    </Button>
                     <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); setTaskToEdit({ id: task.id }); }} // Stop propagation, open without suggestion
                      aria-label="Edit task"
                    >
                      <Edit2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={(e) => { e.stopPropagation(); setShowTaskDeleteConfirm(task.id); }} // Stop propagation, use renamed state
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
      
      {/* Display AI Error Message (Optional - could use toast notifications instead) */}
      {/* {aiErrorTaskId && <p className="text-red-500 text-center text-sm mt-2">Failed to get AI suggestion.</p>} */}


      {taskToEdit && (
        <EditTaskDialog
          taskId={taskToEdit.id}
          initialSuggestion={taskToEdit.aiSuggestion} // Pass suggestion
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
                onClick={() => setShowTaskDeleteConfirm(null)} // Use renamed state setter
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (showTaskDeleteConfirm) { // Use renamed state
                    deleteTask(showTaskDeleteConfirm); // Use renamed state
                    setShowTaskDeleteConfirm(null); // Use renamed state setter
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Attachment Deletion Dialog */}
      <Dialog.Root open={!!attachmentToDelete} onOpenChange={() => setAttachmentToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Delete Attachment</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the attachment: <strong className="break-all">{attachmentToDelete?.attachmentName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setAttachmentToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (attachmentToDelete) {
                    deleteAttachment(attachmentToDelete.taskId, attachmentToDelete.attachmentId);
                    setAttachmentToDelete(null);
                  }
                }}
              >
                Delete Attachment
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
