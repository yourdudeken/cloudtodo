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
  Pin
} from 'lucide-react';

export const AddTodo: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [isStarred, setIsStarred] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { addTodo, categories } = useTodoStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    await addTodo({
      title: title.trim(),
      description: description.trim(),
      completed: false,
      priority,
      category: category.trim(),
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      dueDate: dueDate || undefined,
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
    setIsRecurring(false);
    setRecurringType('daily');
    setRecurringInterval(1);
    setIsStarred(false);
    setIsPinned(false);
    setShowAdvanced(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md">
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="flex space-x-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setIsStarred(!isStarred)}
            className={`p-2 rounded-lg ${
              isStarred ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500'
            }`}
          >
            <Star className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setIsPinned(!isPinned)}
            className={`p-2 rounded-lg ${
              isPinned ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:text-blue-500'
            }`}
          >
            <Pin className="w-5 h-5" />
          </button>
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description (optional)"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Quick Options */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-gray-400" />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
          >
            <span>Advanced</span>
            <ChevronDown className={`w-4 h-4 transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <label className="flex items-center text-sm text-gray-600">
                  <Folder className="w-4 h-4 mr-1" />
                  Category
                </label>
                <input
                  type="text"
                  list="categories"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Enter or select category"
                  className="w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="categories">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="flex items-center text-sm text-gray-600">
                  <Tag className="w-4 h-4 mr-1" />
                  Tags
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Enter tags (comma-separated)"
                  className="w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="flex items-center text-sm text-gray-600">
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
                      className="px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom</option>
                    </select>

                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Every</span>
                      <input
                        type="number"
                        min="1"
                        value={recurringInterval}
                        onChange={(e) => setRecurringInterval(parseInt(e.target.value))}
                        className="w-16 px-2 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">
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