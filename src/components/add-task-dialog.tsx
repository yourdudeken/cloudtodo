import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
// Removed duplicate React and Dialog imports below
import * as Select from '@radix-ui/react-select';
import { Button } from '@/components/ui/button';
import { useTaskStore } from '@/store/tasks'; // Keep Task type import for now, though TaskData is primary
import { TaskData } from '@/lib/google-drive'; // Import TaskData
import { useNotificationStore } from '@/store/notifications'; // Import notification store
import { /*Plus,*/ Star, Pin, Calendar as CalendarIcon, Clock, AlertCircle, Tag, Repeat, Battery as Category, Upload, X, Users, User, Sparkles, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { DayPicker } from 'react-day-picker';

// Define props to accept children
interface AddTaskDialogProps {
  children?: React.ReactNode;
}

export function AddTaskDialog({ children }: AddTaskDialogProps) { // Destructure children
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [dueDate, setDueDate] = React.useState<Date>();
  const [dueTime, setDueTime] = React.useState('');
  const [reminder, setReminder] = React.useState<number>();
  const [priority, setPriority] = React.useState<1 | 2 | 3 | 4>(4);
  const [isStarred, setIsStarred] = React.useState(false);
  const [isPinned, setIsPinned] = React.useState(false);
  const [category, setCategory] = React.useState('');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  // State for task type - store as string 'personal' or 'collaborative' based on UI
  const [taskType, setTaskType] = React.useState<'personal' | 'collaborative'>('personal');
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const [recurrence, setRecurrence] = React.useState<{
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    endDate?: Date;
    occurrences?: number;
  }>({});

  const { addTask, categories, tags, uploadAttachment } = useTaskStore();
  const [newCategory, setNewCategory] = React.useState('');
  const [newTag, setNewTag] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  // State for AI suggestions
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false); // Add submitting state

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission

    setIsSubmitting(true);
    // Corrected: Use imported useNotificationStore
    useNotificationStore.getState().addNotification({ type: 'info', message: 'Creating task...' });

    // 1. Format Task Data according to TaskData interface
    // Corrected: Use imported TaskData type
    const taskPayload: Omit<TaskData, 'id' | 'createdDate' | 'updatedDate' | 'status' | 'attachments'> = {
      taskTitle: title,
      description: description || undefined,
      // Format date as ISO 8601 (YYYY-MM-DD) for reliable parsing
      dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
      dueTime: dueTime || undefined,
      reminder: reminder,
      priority: priority,
      taskType: { // Correctly format based on string state
        isPersonal: taskType === 'personal',
        isCollaborative: taskType === 'collaborative',
      },
      isStarred: isStarred,
      isPinned: isPinned,
      // Put single category into array, handle 'none' or empty string
      categories: category && category !== 'none' ? [category] : [],
      tags: selectedTags, // Already string[]
      // Format recurrence - store as string "None" or the stringified object
      // Format recurrence - store as string "None" or the stringified object
      recurrence: recurrence.frequency && recurrence.interval
        ? JSON.stringify({
            frequency: recurrence.frequency,
            interval: recurrence.interval,
            // Also format endDate consistently if it exists
            endDate: recurrence.endDate ? format(recurrence.endDate, 'yyyy-MM-dd') : undefined,
            occurrences: recurrence.occurrences,
          })
        : "None",
    };

    try {
      // 2. Call addTask from the store, await the new task ID
      const newTaskId = await addTask(taskPayload);

      if (newTaskId) {
        // 3. If task created successfully, upload attachments
        if (files.length > 0) {
          useNotificationStore.getState().addNotification({ type: 'info', message: `Task created. Uploading ${files.length} attachment(s)...` });
          // Use Promise.allSettled to handle potential individual upload failures
          const uploadPromises = files.map(file => uploadAttachment(newTaskId, file));
          const results = await Promise.allSettled(uploadPromises);

          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              console.error(`Failed to upload attachment ${files[index].name}:`, result.reason);
              // Corrected: Use imported useNotificationStore
              useNotificationStore.getState().addNotification({ type: 'warning', message: `Failed to upload attachment: ${files[index].name}` });
            }
          });
        } else {
           // Corrected: Use imported useNotificationStore
           useNotificationStore.getState().addNotification({ type: 'success', message: `Task "${title}" created successfully.` });
        }

        setOpen(false);
        resetForm();
      } else {
        // addTask returned null, indicating failure in the store/Drive
        throw new Error("Task creation failed in store."); // Error handled in catch block
      }
    } catch (error) {
      console.error("Error during task submission:", error);
      // Corrected: Use imported useNotificationStore
      useNotificationStore.getState().addNotification({ type: 'error', message: `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate(undefined);
    setDueTime('');
    setReminder(undefined);
    setPriority(4);
    setIsStarred(false);
    setIsPinned(false);
    setCategory('');
    setSelectedTags([]);
    setRecurrence({});
    setFiles([]);
    setTaskType('personal');
    setAiLoading(false);
    setAiError(false);
  };

  const handleAISuggestion = async () => {
    if (!title && !description) return; // Don't call if both are empty

    setAiLoading(true);
    setAiError(false);
    // Use the renamed environment variable
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey || apiKey === 'PASTE_YOUR_OPENROUTER_KEY_HERE') { // Also check for placeholder
      console.error("VITE_OPENROUTER_API_KEY not found or not set in environment variables.");
      useNotificationStore.getState().addNotification({ type: 'error', message: 'AI Suggestion feature not configured.' }); // Inform user
      setAiError(true);
      setAiLoading(false);
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
        setDescription(suggestion); // Update the description state
      } else {
        console.error('No suggestion received from AI.');
        setAiError(true);
       }

     } catch (error) {
       // Log the specific error object
       console.error('Error fetching AI suggestion:', error);
       // Add notification for more user visibility
       useNotificationStore.getState().addNotification({
         type: 'error',
         message: `AI Suggestion Error: ${error instanceof Error ? error.message : 'Unknown error'}`
       });
       setAiError(true);
     } finally {
      setAiLoading(false);
    }
  };


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
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

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {/* Use children as trigger if provided, otherwise default button */}
      {/* Use children passed via props as the trigger */}
      <Dialog.Trigger asChild>
        {children}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            
            <div className="relative"> {/* Wrap textarea and button */}
              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] pr-10" // Add padding for button
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 text-blue-500 hover:bg-blue-100"
                onClick={handleAISuggestion}
                disabled={aiLoading || (!title && !description)} // Disable if loading or no text
                aria-label="Get AI Suggestion for description"
              >
                {aiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : aiError ? (
                  <Sparkles className="h-4 w-4 text-red-500" /> // Indicate error
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>
            {aiError && <p className="text-xs text-red-500 -mt-2">Error getting suggestion.</p>} {/* Error message */}


            {/* Task Type Selection */}
            {/* Task Type Selection */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Task Type:</label>
              {/* Corrected: Use string value and onValueChange */}
              <Select.Root value={taskType} onValueChange={(value: 'personal' | 'collaborative') => setTaskType(value)}>
                <Select.Trigger className="inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-lg">
                  {/* Corrected: Check string value */}
                  {taskType === 'personal' ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                  <Select.Value placeholder="Select type" /> {/* Add placeholder */}
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white rounded-lg shadow-lg border p-1 z-50">
                    <Select.Viewport>
                      <Select.Item
                        value="personal"
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer rounded capitalize"
                      >
                        <User className="h-4 w-4" />
                        <Select.ItemText>Personal</Select.ItemText>
                      </Select.Item>
                      <Select.Item
                        value="collaborative"
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer rounded capitalize"
                      >
                        <Users className="h-4 w-4" />
                        <Select.ItemText>Collaborative</Select.ItemText>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            <div className="flex flex-wrap gap-4">
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
                    />
                  </div>
                )}
              </div>

              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Due time" // Added aria-label
              />

              {/* Corrected value and onValueChange for reminder */}
              <Select.Root 
                value={reminder?.toString() ?? "none"} 
                onValueChange={(value) => setReminder(value === "none" ? undefined : Number(value))}
              >
                <Select.Trigger className="inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-lg">
                  <Clock className="h-4 w-4" />
                  <Select.Value placeholder="Set reminder" /> {/* Placeholder shown when value is 'none' or undefined */}
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white rounded-lg shadow-lg border p-1 z-50"> {/* Ensure z-index */}
                    <Select.Viewport>
                      {/* Corrected: Map over reminderOptions */}
                      {reminderOptions.map((option) => (
                        <Select.Item
                          key={option.value}
                          value={option.value.toString()}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                        >
                          <Select.ItemText>{option.label}</Select.ItemText> {/* Use option.label for text */}
                        </Select.Item>
                      ))}
                       {/* Added No reminder option */}
                       <Select.Item
                          value="none" 
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
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`w-6 h-6 rounded-full ${
                      priority === p ? priorityColors[p as keyof typeof priorityColors] : 'bg-gray-200'
                    }`}
                    onClick={() => setPriority(p as 1 | 2 | 3 | 4)}
                    aria-label={`Set priority ${p}`} // Added aria-label
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
                <Star className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
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

              <Select.Root value={category} onValueChange={setCategory}>
                <Select.Trigger className="inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-lg">
                  <Category className="h-4 w-4" />
                  <Select.Value placeholder="Select category" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white rounded-lg shadow-lg border p-1 z-50"> {/* Ensure z-index */}
                    <Select.Viewport>
                      {/* Corrected: Map over categories */}
                      {categories.map((cat) => (
                        <Select.Item
                          key={cat}
                          value={cat}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                        >
                          <Select.ItemText>{cat}</Select.ItemText>
                        </Select.Item>
                      ))}
                      {/* Optionally add a "No category" option if desired */}
                       <Select.Item
                          value="none" 
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
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newTag) {
                      useTaskStore.getState().addTag(newTag);
                      // Corrected: Use newTag here
                      setSelectedTags([...selectedTags, newTag]);
                      setNewTag('');
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
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
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newTag) {
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

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Recurrence
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <Select.Root
                  value={recurrence.frequency}
                  onValueChange={(value: any) =>
                    setRecurrence({ ...recurrence, frequency: value })
                  }
                >
                  <Select.Trigger
                    className="inline-flex items-center justify-between px-3 py-2 border rounded-lg"
                    aria-label="Recurrence frequency" // Added aria-label
                  >
                    <Select.Value placeholder="Frequency" />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="bg-white rounded-lg shadow-lg border p-1">
                      <Select.Viewport>
                        {['daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
                          <Select.Item
                            key={freq}
                            value={freq}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded capitalize"
                          >
                            <Select.ItemText>{freq}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>

                <div> {/* Wrap input and label */}
                  <label htmlFor="recurrence-interval" className="sr-only">Recurrence Interval</label> {/* Visually hidden label */}
                  <input
                    id="recurrence-interval" // Add id
                    type="number"
                    min="1"
                    placeholder="Interval" // Added placeholder back
                    value={recurrence.interval || ''}
                    onChange={(e) =>
                      setRecurrence({ ...recurrence, interval: Number(e.target.value) })
                    }
                    className="px-3 py-2 border rounded-lg w-full"
                    aria-label="Recurrence interval" // Keep aria-label
                    title="Recurrence interval"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <input
                placeholder="Attachments (optional)"
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
              />
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Add Attachments
              </Button>
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 p-2 rounded"
                    >
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !title.trim()}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Adding...' : 'Add Task'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
