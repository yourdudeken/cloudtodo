import React, { useState } from 'react';
import { useTodoStore } from '../store/todos';
import {
  Plus,
  Calendar,
  Clock,
  Tag,
  Folder,
  AlertCircle,
  ChevronDown,
  Repeat,
  Star,
  Pin,
  Bell
} from 'lucide-react';
import { format } from 'date-fns';

export const AddTodo: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [isStarred, setIsStarred] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [reminderTime, setReminderTime] = useState('30'); // minutes before due time

  const { addTodo, categories } = useTodoStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    // Combine date and time for due date
    let fullDueDate: string | undefined;
    if (dueDate && dueTime) {
      const dateObj = new Date(`${dueDate}T${dueTime}`);
      fullDueDate = dateObj.toISOString();
    }

    // Calculate reminder time
    let reminderDate: string | undefined;
    if (fullDueDate && reminderTime) {
      const dueDateTime = new Date(fullDueDate);
      const reminderMinutes = parseInt(reminderTime);
      const reminderDateTime = new Date(dueDateTime.getTime() - reminderMinutes * 60000);
      reminderDate = reminderDateTime.toISOString();
    }

    await addTodo({
      title: title.trim(),
      description: description.trim(),
      completed: false,
      priority,
      category: category.trim(),
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      dueDate: fullDueDate,
      reminder: reminderDate,
      isRecurring,
      recurringPattern: isRecurring ? {
        type: recurringType,
        interval: recurringInterval,
      } : undefined,
      isStarred,
      isPinned,
      subtasks: [],
      attachments: [],
      comments: [],
    });

    // Reset form
    setTitle('');
    setDescription('');
    setPriority('medium');
    setCategory('');
    setTags('');
    setDueDate('');
    setDueTime('');
    setIsRecurring(false);
    setRecurringType('daily');
    setRecurringInterval(1);
    setIsStarred(false);
    setIsPinned(false);
    setShowAdvanced(false);
    setReminderTime('30');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="flex space-x-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <button
            type="button"
            onClick={() => setIsStarred(!isStarred)}
            className={`p-2 rounded-lg ${
              isStarred ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-400 hover:text-yellow-500'
            }`}
          >
            <Star className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setIsPinned(!isPinned)}
            className={`p-2 rounded-lg ${
              isPinned ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 hover:text-blue-500'
            }`}
          >
            <Pin className="w-5 h-5" />
          </button>
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description (optional)"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />

        {/* Quick Options */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-gray-400" />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gray-400" />
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-gray-400" />
            <select
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="0">No reminder</option>
              <option value="5">5 minutes before</option>
              <option value="15">15 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="60">1 hour before</option>
              <option value="1440">1 day before</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <span>Advanced</span>
            <ChevronDown className={`w-4 h-4 transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <label className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Folder className="w-4 h-4 mr-1" />
                  Category
                </label>
                <input
                  type="text"
                  list="categories"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Enter or select category"
                  className="w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <datalist id="categories">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Tag className="w-4 h-4 mr-1" />
                  Tags
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Enter tags (comma-separated)"
                  className="w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            {/* Recurring Options */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded text-blue-500 focus:ring-blue-500 dark:bg-gray-700"
                />
                <span className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Repeat className="w-4 h-4 mr-1" />
                  Recurring Task
                </span>
              </label>

              {isRecurring && (
                <div className="ml-6 space-y-2">
                  <div className="flex space-x-4">
                    <select
                      value={recurringType}
                      onChange={(e) => setRecurringType(e.target.value as any)}
                      className="px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom</option>
                    </select>

                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Every</span>
                      <input
                        type="number"
                        min="1"
                        value={recurringInterval}
                        onChange={(e) => setRecurringInterval(parseInt(e.target.value))}
                        className="w-16 px-2 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {recurringType === 'daily' && 'days'}
                        {recurringType === 'weekly' && 'weeks'}
                        {recurringType === 'monthly' && 'months'}
                        {recurringType === 'custom' && 'intervals'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center space-x-2"
      >
        <Plus className="w-5 h-5" />
        <span>Add Todo</span>
      </button>
    </form>
  );
};