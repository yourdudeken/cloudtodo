import * as React from 'react'; // Single React import
import * as Dialog from '@radix-ui/react-dialog'; // Single Dialog import
import * as Select from '@radix-ui/react-select';
import { Button } from '@/components/ui/button';
import { useTaskStore, Task } from '@/store/tasks'; // Import Task type
import { useNotificationStore } from '@/store/notifications'; // Import notification store
// FileAttachment seems unused, removing import
// import { FileAttachment } from '@/lib/google-drive'; 
import { Star, Pin, Calendar as CalendarIcon, Clock, AlertCircle, Tag, Repeat, Battery as Category, Upload, X, Paperclip, Trash2 } from 'lucide-react'; // Add Paperclip, Trash2
import { format } from 'date-fns';
import { DayPicker } from 'react-day-picker';

interface EditTaskDialogProps {
  taskId: string;
  initialSuggestion?: string; // Add optional initialSuggestion prop
  onClose: () => void;
}

export function EditTaskDialog({ taskId, initialSuggestion, onClose }: EditTaskDialogProps): React.ReactElement | null { // Add return type annotation
  // Explicitly type the task state
  const task = useTaskStore((state) => state.tasks.find((t): t is Task => t.id === taskId));
  const updateTask = useTaskStore((state) => state.updateTask);
  const uploadAttachment = useTaskStore((state) => state.uploadAttachment);
  const deleteAttachment = useTaskStore((state) => state.deleteAttachment);

  const [title, setTitle] = React.useState(task?.title || '');
  const [description, setDescription] = React.useState(task?.description || '');
  const [dueDate, setDueDate] = React.useState<Date | undefined>(task?.dueDate);
  const [dueTime, setDueTime] = React.useState(task?.dueTime || '');
  // Initialize reminder state to undefined if task.reminder is null, undefined, or 0 (assuming 0 isn't a valid reminder value)
  const [reminder, setReminder] = React.useState<number | undefined>(task?.reminder || undefined);
  const [priority, setPriority] = React.useState<1 | 2 | 3 | 4>(task?.priority || 4);
  const [isStarred, setIsStarred] = React.useState(task?.isStarred || false);
  const [isPinned, setIsPinned] = React.useState(task?.isPinned || false);
  // Initialize category state to undefined if task.category is null, undefined, or empty string
  const [category, setCategory] = React.useState(task?.category || ''); // Keep existing logic, as `|| ''` handles falsy values correctly for string state
  const [selectedTags, setSelectedTags] = React.useState<string[]>(task?.tags || []);
  const [showCalendar, setShowCalendar] = React.useState(false);
  // Removed recurrence state

  const { categories, tags } = useTaskStore();
  const [newCategory, setNewCategory] = React.useState('');
  const [newTag, setNewTag] = React.useState('');

  // State and ref for file input
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTask(taskId, {
      title,
      description,
      dueDate,
      dueTime,
      reminder,
      priority,
      isStarred,
      isPinned,
      category,
      tags: selectedTags,
      // Removed recurrence from updateTask call
      // Note: Attachments are handled separately by upload/delete actions, not saved here.
    });
    onClose();
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

  // Effect to update local state if the task prop changes or if an initial suggestion is provided
  React.useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      // Use initialSuggestion if provided, otherwise use task's description (added parentheses for clarity)
      setDescription(initialSuggestion ?? (task.description || '')); 
      setDueDate(task.dueDate);
      setDueTime(task.dueTime || '');
      // Ensure reminder state is set to undefined if task.reminder is null/undefined/0
      setReminder(task.reminder || undefined);
      setPriority(task.priority || 4);
      setIsStarred(task.isStarred || false);
      setIsPinned(task.isPinned || false);
      // Ensure category state is set to '' if task.category is null/undefined/''
      setCategory(task.category || ''); // Keep existing logic
      setSelectedTags(task.tags || []);
      // Removed recurrence update from useEffect
      // Attachments are part of the task object, so they update automatically
    }
  }, [task, initialSuggestion]); // Rerun effect if task or initialSuggestion changes

  // NOTE: Removed pre-calculated variable as it didn't seem to help TS

  // Removed isIntervalDisabled variable

  if (!task) return null; // Return null if task not found

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg overflow-y-auto data-[state=open]:animate-contentShow focus:outline-none">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-2xl font-semibold">Edit Task</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ... other form inputs ... */}
             <input
              type="text"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              aria-label="Task title"
            />

            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              aria-label="Task description"
            />

            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setShowCalendar(!showCalendar)}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Due date'}
                </Button>
                {showCalendar && (
                  <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg z-50 border">
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
                aria-label="Due time" // Add aria-label
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Use "none" for empty reminder state */}
              <Select.Root
                value={reminder?.toString() ?? "none"} // Default to "none" if reminder is null/undefined
                onValueChange={(value) => setReminder(value === "none" ? undefined : Number(value))} // Map "none" back to undefined
              >
                <Select.Trigger className="inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-lg">
                  <Clock className="h-4 w-4" />
                  <Select.Value placeholder="Set reminder" /> {/* Placeholder shown when value is '' */}
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white rounded-lg shadow-lg border p-1 z-50">
                    <Select.Viewport>
                      {reminderOptions.map((option) => (
                        <Select.Item
                          key={option.value}
                          value={option.value.toString()}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                        >
                          <Select.ItemText>{option.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                       <Select.Item
                          value="none" // Use "none" instead of ""
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-gray-500"
                        >
                          <Select.ItemText>No reminder</Select.ItemText>
                        </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Priority:</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-label={`Set priority ${p}`} // Add aria-label
                    className={`w-6 h-6 rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      priority === p ? priorityColors[p as keyof typeof priorityColors] : 'bg-gray-200 hover:bg-gray-300'
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
                className="gap-2"
                onClick={() => setIsStarred(!isStarred)}
              >
                <Star className={`h-4 w-4 ${isStarred ? 'fill-current text-yellow-400' : ''}`} />
                Star
              </Button>

              <Button
                type="button"
                variant={isPinned ? 'default' : 'outline'}
                className="gap-2"
                onClick={() => setIsPinned(!isPinned)}
              >
                <Pin className={`h-4 w-4 ${isPinned ? 'fill-current' : ''}`} />
                Pin
              </Button>

              {/* Use "none" for empty category state */}
              <Select.Root value={category ?? "none"} onValueChange={(value) => setCategory(value === "none" ? "" : value)}> {/* Map "none" back to "" */}
                <Select.Trigger className="inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-lg">
                  <Category className="h-4 w-4" />
                  <Select.Value placeholder="Select category" /> {/* Placeholder shown when value is '' */}
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white rounded-lg shadow-lg border p-1 z-50">
                    <Select.Viewport>
                      {categories.map((cat) => (
                        <Select.Item
                          key={cat}
                          value={cat}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                        >
                          <Select.ItemText>{cat}</Select.ItemText>
                        </Select.Item>
                      ))}
                       <Select.Item
                          value="none" // Use "none" instead of ""
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-gray-500"
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
                  className="px-3 py-2 border rounded-lg"
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
              <label className="text-sm font-medium">Tags:</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    size="sm"
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
                  className="px-3 py-2 border rounded-lg"
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

            {/* Removed Recurrence Section */}

            {/* Attachments Section */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
              </h4>
              {/* List existing attachments */}
              <div className="space-y-1 max-h-32 overflow-y-auto border dark:border-gray-600 rounded-md p-2"> {/* Add scroll, border, padding */}
                {task?.attachments && task.attachments.length > 0 ? (
                  task.attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between text-sm p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                    <a
                      href={att.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline truncate mr-2 flex-grow dark:text-gray-200"
                      title={att.name} // Add title for long names
                    >
                      {att.name}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 flex-shrink-0" // Adjusted hover for dark mode
                      onClick={() => deleteAttachment(taskId, att.id)}
                      title="Delete attachment" // Title acts as label here
                      aria-label={`Delete attachment ${att.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 px-2 py-1">No attachments yet.</p> // Adjusted styling
                )}
              </div>
              {/* Add attachment button */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setIsUploading(true);
                      try {
                        await uploadAttachment(taskId, file);
                        // Optionally show success notification
                        useNotificationStore.getState().addNotification({
                          type: 'success',
                          message: `Uploaded ${file.name}`
                        });
                      } catch (error) {
                        console.error("Upload failed:", error);
                        // Show error notification
                         useNotificationStore.getState().addNotification({
                          type: 'error',
                          message: `Failed to upload ${file.name}`
                        });
                      } finally {
                        setIsUploading(false);
                        // Reset file input value so the same file can be selected again if needed
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }
                    }
                  }}
                  className="hidden"
                  aria-hidden="true" // Hide from accessibility tree as it's triggered by button
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2 mt-2" // Add margin top
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? 'Uploading...' : 'Add Attachment'}
                </Button>
              </div>
            </div>
            {/* End Attachments Section */}


            <div className="flex justify-end gap-2 pt-4 border-t mt-6"> {/* Add border top */}
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
