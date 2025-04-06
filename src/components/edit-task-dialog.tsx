import * as React from 'react'; // Keep only one React import
import * as Dialog from '@radix-ui/react-dialog'; // Keep only one Dialog import
import * as Select from '@radix-ui/react-select'; // Keep only one Select import
import { Button } from '@/components/ui/button'; // Keep only one Button import
// Import Task type (aliased TaskData) and UIAttachment
import { useTaskStore, Task, UIAttachment } from '@/store/tasks';
import { useNotificationStore } from '@/store/notifications';
// Import necessary icons, remove duplicates if any
import { Star, Pin, Calendar as CalendarIcon, Clock, AlertCircle, Tag, /*Repeat,*/ Battery as Category, Upload, X, Paperclip, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns'; // Import parseISO
import { DayPicker } from 'react-day-picker';

interface EditTaskDialogProps {
  taskId: string;
  initialSuggestion?: string;
  onClose: () => void;
}

export function EditTaskDialog({ taskId, initialSuggestion, onClose }: EditTaskDialogProps): React.ReactElement | null {
  const { task, uiAttachments, categories, tags } = useTaskStore((state) => ({
      task: state.tasks.find((t): t is Task => t.id === taskId),
      uiAttachments: state.uiAttachments[taskId] || [],
      categories: state.categories, // Get categories from store
      tags: state.tags // Get tags from store
  }));
  const updateTask = useTaskStore((state) => state.updateTask);
  const uploadAttachment = useTaskStore((state) => state.uploadAttachment);
  // Uncomment deleteAttachment as it's now implemented in the store
  const deleteAttachment = useTaskStore((state) => state.deleteAttachment);

  // State for form fields
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [dueDate, setDueDate] = React.useState<Date | undefined>(undefined);
  const [dueTime, setDueTime] = React.useState('');
  const [reminder, setReminder] = React.useState<number | undefined>(undefined);
  const [priority, setPriority] = React.useState<1 | 2 | 3 | 4>(4);
  const [isStarred, setIsStarred] = React.useState(false);
  const [isPinned, setIsPinned] = React.useState(false);
  const [category, setCategory] = React.useState('');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [recurrence, setRecurrence] = React.useState<string | undefined>(undefined);
  const [taskType, setTaskType] = React.useState<'personal' | 'collaborative'>('personal');

  const [newCategory, setNewCategory] = React.useState('');
  const [newTag, setNewTag] = React.useState('');
  const [attachmentToDelete, setAttachmentToDelete] = React.useState<UIAttachment | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  // Effect to initialize state when task data is available or changes
  React.useEffect(() => {
    if (task) {
      setTitle(task.taskTitle || '');
      setDescription(initialSuggestion ?? (task.description || ''));
      try {
        setDueDate(task.dueDate ? parseISO(task.dueDate) : undefined);
      } catch (e) {
        console.error("Error parsing dueDate in Edit Dialog:", task.dueDate, e);
        setDueDate(undefined);
      }
      setDueTime(task.dueTime || '');
      setReminder(task.reminder);
      // Add type assertion to satisfy the state setter
      setPriority((task.priority ?? 4) as 1 | 2 | 3 | 4);
      setIsStarred(task.isStarred || false);
      setIsPinned(task.isPinned || false);
      setCategory(task.categories?.[0] || '');
      setSelectedTags(task.tags || []);
      setTaskType(task.taskType?.isCollaborative ? 'collaborative' : 'personal');
      setRecurrence(task.recurrence);
    }
  }, [task, initialSuggestion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task?.id) return;

    updateTask(task.id, {
      taskTitle: title,
      description: description || undefined,
      dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
      dueTime: dueTime || undefined,
      reminder: reminder,
      priority: priority,
      isStarred: isStarred,
      isPinned: isPinned,
      categories: category ? [category] : [],
      tags: selectedTags,
      taskType: {
          isPersonal: taskType === 'personal',
          isCollaborative: taskType === 'collaborative',
      },
      recurrence: recurrence || "None",
    });
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && task?.id) {
          setIsUploading(true);
          try {
              await uploadAttachment(task.id, file);
              useNotificationStore.getState().addNotification({
                  type: 'success',
                  message: `Uploaded ${file.name}`
              });
          } catch (error) {
              console.error("Upload failed:", error);
              useNotificationStore.getState().addNotification({
                  type: 'error',
                  message: `Failed to upload ${file.name}`
              });
          } finally {
              setIsUploading(false);
              if (fileInputRef.current) {
                  fileInputRef.current.value = '';
              }
          }
      }
  };

  // Placeholder for delete handler
  const handleDeleteAttachmentClick = (attachment: UIAttachment) => {
      console.warn("Attachment deletion not implemented yet.");
      setAttachmentToDelete(attachment); // Show confirmation dialog
  };

  const confirmDeleteAttachment = () => {
      if (attachmentToDelete && task?.id) {
          // Call the store function
          deleteAttachment(task.id, attachmentToDelete.driveFileId);
          setAttachmentToDelete(null); // Close dialog
      }
  };


  const reminderOptions = [
    { value: 5, label: '5 minutes before' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
  ];

  const priorityColors = {
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-blue-500',
    4: 'bg-gray-500',
  };

  if (!task) return null;

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white dark:bg-gray-800 p-6 shadow-lg overflow-y-auto data-[state=open]:animate-contentShow focus:outline-none dark:text-gray-200">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-2xl font-semibold dark:text-white">Edit Task</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
             <input
              type="text"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              required
              aria-label="Task title"
            />

            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] dark:bg-gray-700 dark:border-gray-600"
              aria-label="Task description"
            />

            {/* Task Type Selector */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium dark:text-gray-300">Task Type:</label>
              <Select.Root value={taskType} onValueChange={(value: 'personal' | 'collaborative') => setTaskType(value)}>
                <Select.Trigger className="inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                  <Select.Value placeholder="Select type" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white dark:bg-gray-700 rounded-lg shadow-lg border dark:border-gray-600 p-1 z-50">
                    <Select.Viewport>
                      <Select.Item value="personal" className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer rounded">Personal</Select.Item>
                      <Select.Item value="collaborative" className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer rounded">Collaborative</Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>


            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                  onClick={() => setShowCalendar(!showCalendar)}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Due date'}
                </Button>
                {showCalendar && (
                  <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 border dark:border-gray-600">
                    <DayPicker
                      mode="single"
                      selected={dueDate}
                      onSelect={(date) => {
                        setDueDate(date || undefined);
                        setShowCalendar(false);
                      }}
                      initialFocus
                    />
                  </div>
                )}
              </div>

              <input
                type="time"
                aria-label="Due time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />

              <Select.Root
                value={reminder?.toString() ?? "none"}
                onValueChange={(value) => setReminder(value === "none" ? undefined : Number(value))}
              >
                <Select.Trigger className="inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                  <Clock className="h-4 w-4" />
                  <Select.Value placeholder="Set reminder" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white dark:bg-gray-700 rounded-lg shadow-lg border dark:border-gray-600 p-1 z-50">
                    <Select.Viewport>
                      {reminderOptions.map((option) => (
                        <Select.Item
                          key={option.value}
                          value={option.value.toString()}
                          className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer rounded"
                        >
                          <Select.ItemText>{option.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                       <Select.Item
                          value="none"
                          className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer rounded text-gray-500 dark:text-gray-400"
                        >
                          <Select.ItemText>No reminder</Select.ItemText>
                        </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium dark:text-gray-300">Priority:</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-label={`Set priority ${p}`}
                    className={`w-6 h-6 rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      priority === p ? priorityColors[p as keyof typeof priorityColors] : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                    onClick={() => setPriority(p as 1 | 2 | 3 | 4)}
                  />
                ))}
                <AlertCircle className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                type="button"
                variant={isStarred ? 'default' : 'outline'}
                className="gap-2 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                onClick={() => setIsStarred(!isStarred)}
              >
                <Star className={`h-4 w-4 ${isStarred ? 'fill-current text-yellow-400' : ''}`} />
                Star
              </Button>

              <Button
                type="button"
                variant={isPinned ? 'default' : 'outline'}
                className="gap-2 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                onClick={() => setIsPinned(!isPinned)}
              >
                <Pin className={`h-4 w-4 ${isPinned ? 'fill-current' : ''}`} />
                Pin
              </Button>

              <Select.Root value={category ?? "none"} onValueChange={(value) => setCategory(value === "none" ? "" : value)}>
                <Select.Trigger className="inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                  <Category className="h-4 w-4" />
                  <Select.Value placeholder="Select category" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white dark:bg-gray-700 rounded-lg shadow-lg border dark:border-gray-600 p-1 z-50">
                    <Select.Viewport>
                      {categories.map((cat) => (
                        <Select.Item
                          key={cat}
                          value={cat}
                          className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer rounded"
                        >
                          <Select.ItemText>{cat}</Select.ItemText>
                        </Select.Item>
                      ))}
                       <Select.Item
                          value="none"
                          className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer rounded text-gray-500 dark:text-gray-400"
                        >
                          <Select.ItemText>No category</Select.ItemText>
                        </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  aria-label="New category name"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newCategory && !categories.includes(newCategory)) {
                      useTaskStore.getState().addCategory(newCategory);
                      setCategory(newCategory);
                      setNewCategory('');
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-300">Tags:</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    size="sm"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                    onClick={() => {
                      setSelectedTags(
                        selectedTags.includes(tag)
                          ? selectedTags.filter((t) => t !== tag)
                          : [...selectedTags, tag]
                      );
                    }}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  aria-label="New tag name"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newTag && !tags.includes(newTag)) {
                      useTaskStore.getState().addTag(newTag);
                      setSelectedTags([...selectedTags, newTag]);
                      setNewTag('');
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Attachments Section */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2 dark:text-gray-100">
                <Paperclip className="h-4 w-4" />
                Attachments
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto border dark:border-gray-600 rounded-md p-2">
                {uiAttachments.length > 0 ? (
                  uiAttachments.map((att) => (
                  <div key={att.driveFileId} className="flex items-center justify-between text-sm p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                    <div className="flex items-center gap-2 flex-grow">
                      <a 
                        href={att.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate dark:text-gray-200"
                        title={att.name}
                      >
                        {att.name}
                      </a>
                      {att.size && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          (${(att.size/1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 flex-shrink-0"
                      onClick={() => handleDeleteAttachmentClick(att)}
                      title="Delete attachment"
                      aria-label={`Delete attachment ${att.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 px-2 py-1">No attachments.</p>
                )}
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  aria-hidden="true"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2 mt-2 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? 'Uploading...' : 'Add Attachment'}
                </Button>
              </div>
            </div>
            {/* End Attachments Section */}


            <div className="flex justify-end gap-2 pt-4 border-t mt-6 dark:border-gray-600">
              <Button type="button" variant="outline" onClick={onClose} className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600">
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
      {/* Add Attachment Deletion Confirmation Dialog */}
       <Dialog.Root open={!!attachmentToDelete} onOpenChange={() => setAttachmentToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white dark:bg-gray-800 p-6 shadow-lg">
            <Dialog.Title className="text-xl font-semibold mb-4 dark:text-white">Delete Attachment</Dialog.Title>
            <Dialog.Description className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete the attachment: <strong className="break-all">{attachmentToDelete?.name}</strong>? This action cannot be undone.
            </Dialog.Description>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setAttachmentToDelete(null)}
                className="dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteAttachment} // Use confirmation handler
              >
                Delete Attachment
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Dialog.Root>
  );
}
