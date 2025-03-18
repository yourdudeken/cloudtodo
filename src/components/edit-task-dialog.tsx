import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { Button } from '@/components/ui/button';
import { useTaskStore } from '@/store/tasks';
import { Star, Pin, Calendar as CalendarIcon, Clock, AlertCircle, Tag, Repeat, Battery as Category, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { DayPicker } from 'react-day-picker';

interface EditTaskDialogProps {
  taskId: string;
  onClose: () => void;
}

export function EditTaskDialog({ taskId, onClose }: EditTaskDialogProps) {
  const task = useTaskStore((state) => state.tasks.find(t => t.id === taskId));
  const updateTask = useTaskStore((state) => state.updateTask);
  
  const [title, setTitle] = React.useState(task?.title || '');
  const [description, setDescription] = React.useState(task?.description || '');
  const [dueDate, setDueDate] = React.useState<Date | undefined>(task?.dueDate);
  const [dueTime, setDueTime] = React.useState(task?.dueTime || '');
  const [reminder, setReminder] = React.useState<number | undefined>(task?.reminder);
  const [priority, setPriority] = React.useState<1 | 2 | 3 | 4>(task?.priority || 4);
  const [isStarred, setIsStarred] = React.useState(task?.isStarred || false);
  const [isPinned, setIsPinned] = React.useState(task?.isPinned || false);
  const [category, setCategory] = React.useState(task?.category || '');
  const [selectedTags, setSelectedTags] = React.useState<string[]>(task?.tags || []);
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [recurrence, setRecurrence] = React.useState(task?.recurrence || {});

  const { categories, tags } = useTaskStore();
  const [newCategory, setNewCategory] = React.useState('');
  const [newTag, setNewTag] = React.useState('');

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
      recurrence: recurrence.frequency ? recurrence : undefined,
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

  if (!task) return null;

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Edit Task</h2>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon">
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
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            />

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
              />

              <Select.Root value={reminder?.toString()} onValueChange={(value) => setReminder(Number(value))}>
                <Select.Trigger className="inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-lg">
                  <Clock className="h-4 w-4" />
                  <Select.Value placeholder="Set reminder" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-white rounded-lg shadow-lg border p-1">
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
                  <Select.Content className="bg-white rounded-lg shadow-lg border p-1">
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
                    if (newCategory) {
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
                  <Select.Trigger className="inline-flex items-center justify-between px-3 py-2 border rounded-lg">
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

                <input
                  type="number"
                  min="1"
                  placeholder="Interval"
                  value={recurrence.interval || ''}
                  onChange={(e) =>
                    setRecurrence({ ...recurrence, interval: Number(e.target.value) })
                  }
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
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