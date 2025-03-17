import React, { useState } from 'react';
import { useTodoStore } from '../store/todos';
import { CalendarView } from './CalendarView';
import { 
  Trash2, Edit, CheckSquare, Square, Star, AlertCircle,
  Calendar, Clock, Paperclip, MessageSquare, Pin, ChevronDown,
  ChevronUp, Save, X
} from 'lucide-react';
import { format } from 'date-fns';

export const TodoList: React.FC = () => {
  const { 
    todos, updateTodo, deleteTodo, toggleTodoComplete,
    toggleStarred, togglePinned, view
  } = useTodoStore();
  const [expandedTodo, setExpandedTodo] = useState<string | null>(null);
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Todo>>({});

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      default:
        return 'text-green-500';
    }
  };

  const toggleExpand = (todoId: string) => {
    setExpandedTodo(expandedTodo === todoId ? null : todoId);
  };

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo.id);
    setEditForm(todo);
  };

  const handleSave = async () => {
    if (editingTodo && editForm) {
      await updateTodo(editingTodo, editForm);
      setEditingTodo(null);
      setEditForm({});
    }
  };

  const handleCancelEdit = () => {
    setEditingTodo(null);
    setEditForm({});
  };

  const renderTodoItem = (todo: Todo) => {
    if (editingTodo === todo.id) {
      return (
        <div key={todo.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="space-y-4">
            <input
              type="text"
              value={editForm.title || ''}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Title"
            />
            <textarea
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Description"
            />
            <div className="flex items-center space-x-4">
              <select
                value={editForm.priority || 'medium'}
                onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <input
                type="date"
                value={editForm.dueDate || ''}
                onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 flex items-center space-x-1"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-1"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={todo.id}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 ${
          todo.isPinned ? 'border-2 border-blue-500 dark:border-blue-400' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <button
              onClick={() => toggleTodoComplete(todo.id)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              {todo.completed ? (
                <CheckSquare className="w-6 h-6" />
              ) : (
                <Square className="w-6 h-6" />
              )}
            </button>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3
                  className={`text-lg font-medium ${
                    todo.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {todo.title}
                </h3>
                {todo.dueDate && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {format(new Date(todo.dueDate), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
              {todo.description && (
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{todo.description}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {todo.category && (
                  <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs px-2 py-1 rounded">
                    {todo.category}
                  </span>
                )}
                {todo.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {todo.isRecurring && (
              <Clock className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            )}
            <button
              onClick={() => toggleStarred(todo.id)}
              className={`${
                todo.isStarred ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500'
              } hover:text-yellow-500`}
            >
              <Star className="w-5 h-5" />
            </button>
            <button
              onClick={() => togglePinned(todo.id)}
              className={`${
                todo.isPinned ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
              } hover:text-blue-500`}
            >
              <Pin className="w-5 h-5" />
            </button>
            <AlertCircle
              className={`w-5 h-5 ${getPriorityColor(todo.priority)}`}
            />
            <button
              onClick={() => handleEdit(todo)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="text-gray-500 dark:text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => toggleExpand(todo.id)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              {expandedTodo === todo.id ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {expandedTodo === todo.id && (
          <div className="mt-4 space-y-4">
            {/* Subtasks */}
            {todo.subtasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800 dark:text-gray-200">Subtasks</h4>
                {todo.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center space-x-2 ml-4"
                  >
                    <button
                      onClick={() =>
                        updateTodo(todo.id, {
                          subtasks: todo.subtasks.map((st) =>
                            st.id === subtask.id
                              ? { ...st, completed: !st.completed }
                              : st
                          ),
                        })
                      }
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      {subtask.completed ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <span
                      className={`${
                        subtask.completed 
                          ? 'line-through text-gray-400 dark:text-gray-500' 
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {subtask.title}
                    </span>
                    {subtask.dueDate && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(subtask.dueDate), 'MMM d')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Attachments */}
            {todo.attachments.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                  <Paperclip className="w-4 h-4 mr-1" />
                  Attachments
                </h4>
                <div className="flex flex-wrap gap-2">
                  {todo.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <Paperclip className="w-4 h-4" />
                      <span>{attachment.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            {todo.comments.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Comments
                </h4>
                <div className="space-y-2">
                  {todo.comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>{comment.userName}</span>
                        <span>
                          {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="mt-1 text-gray-700 dark:text-gray-300">{comment.content}</p>
                      {comment.attachments && comment.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {comment.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>{attachment.name}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTodoList = () => (
    <div className="space-y-4">
      {/* Pinned todos */}
      {todos.some((todo) => todo.isPinned) && (
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-200">📌 Pinned</h2>
          {todos
            .filter((todo) => todo.isPinned)
            .map((todo) => renderTodoItem(todo))}
        </div>
      )}

      {/* Regular todos */}
      <div className="space-y-2">
        <h2 className="text-lg font-medium text-gray-700 dark:text-gray-200">📝 Tasks</h2>
        {todos
          .filter((todo) => !todo.isPinned)
          .map((todo) => renderTodoItem(todo))}
      </div>
    </div>
  );

  const renderPinnedView = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">📌 Pinned Tasks</h2>
      {todos
        .filter((todo) => todo.isPinned)
        .map((todo) => renderTodoItem(todo))}
    </div>
  );

  return (
    <div className="space-y-4">
      {view === 'list' && renderTodoList()}
      {view === 'pinned' && renderPinnedView()}
      {view === 'calendar' && <CalendarView />}
      {/* Add Kanban view here */}
    </div>
  );
};