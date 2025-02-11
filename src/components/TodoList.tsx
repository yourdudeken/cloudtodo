import React, { useState } from 'react';
import { useTodoStore } from '../store/todos';
import { 
  Trash2, Edit, CheckSquare, Square, Star, AlertCircle,
  Calendar, Clock, Paperclip, MessageSquare, Pin, ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';

export const TodoList: React.FC = () => {
  const { 
    todos, updateTodo, deleteTodo, toggleTodoComplete,
    toggleStarred, togglePinned, view
  } = useTodoStore();
  const [expandedTodo, setExpandedTodo] = useState<string | null>(null);

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

  const renderTodoItem = (todo: Todo) => (
    <div
      key={todo.id}
      className={`bg-white rounded-lg shadow-md p-4 ${
        todo.isPinned ? 'border-2 border-blue-500' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <button
            onClick={() => toggleTodoComplete(todo.id)}
            className="text-gray-500 hover:text-gray-700"
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
                  todo.completed ? 'line-through text-gray-400' : ''
                }`}
              >
                {todo.title}
              </h3>
              {todo.dueDate && (
                <span className="text-sm text-gray-500 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {format(new Date(todo.dueDate), 'MMM d, yyyy')}
                </span>
              )}
            </div>
            {todo.description && (
              <p className="text-gray-500 text-sm mt-1">{todo.description}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {todo.category && (
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                  {todo.category}
                </span>
              )}
              {todo.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {todo.isRecurring && (
            <Clock className="w-5 h-5 text-blue-500" />
          )}
          <button
            onClick={() => toggleStarred(todo.id)}
            className={`${
              todo.isStarred ? 'text-yellow-500' : 'text-gray-400'
            } hover:text-yellow-500`}
          >
            <Star className="w-5 h-5" />
          </button>
          <button
            onClick={() => togglePinned(todo.id)}
            className={`${
              todo.isPinned ? 'text-blue-500' : 'text-gray-400'
            } hover:text-blue-500`}
          >
            <Pin className="w-5 h-5" />
          </button>
          <AlertCircle
            className={`w-5 h-5 ${getPriorityColor(todo.priority)}`}
          />
          <button
            onClick={() => {
              // Handle edit
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={() => deleteTodo(todo.id)}
            className="text-gray-500 hover:text-red-500"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => toggleExpand(todo.id)}
            className="text-gray-500 hover:text-gray-700"
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
              <h4 className="font-medium">Subtasks</h4>
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
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {subtask.completed ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  <span
                    className={subtask.completed ? 'line-through text-gray-400' : ''}
                  >
                    {subtask.title}
                  </span>
                  {subtask.dueDate && (
                    <span className="text-sm text-gray-500">
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
              <h4 className="font-medium flex items-center">
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
                    className="flex items-center space-x-1 bg-gray-100 text-gray-700 text-sm px-2 py-1 rounded hover:bg-gray-200"
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
              <h4 className="font-medium flex items-center">
                <MessageSquare className="w-4 h-4 mr-1" />
                Comments
              </h4>
              <div className="space-y-2">
                {todo.comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 p-2 rounded">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{comment.userName}</span>
                      <span>
                        {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="mt-1">{comment.content}</p>
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {comment.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded hover:bg-gray-200"
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

  const renderTodoList = () => (
    <div className="space-y-4">
      {/* Pinned todos */}
      {todos.some((todo) => todo.isPinned) && (
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-gray-700">📌 Pinned</h2>
          {todos
            .filter((todo) => todo.isPinned)
            .map((todo) => renderTodoItem(todo))}
        </div>
      )}

      {/* Regular todos */}
      <div className="space-y-2">
        <h2 className="text-lg font-medium text-gray-700">📝 Tasks</h2>
        {todos
          .filter((todo) => !todo.isPinned)
          .map((todo) => renderTodoItem(todo))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {view === 'list' && renderTodoList()}
      {/* Add Kanban and Calendar views here */}
    </div>
  );
};