import React, { useState } from 'react';
import { useTodoStore } from '../store/todos';
import { Todo } from '../types/todo';
import { Plus, MoreVertical } from 'lucide-react';

export const KanbanBoard: React.FC = () => {
  const { todos, updateTodo } = useTodoStore();
  const [draggedTodo, setDraggedTodo] = useState<Todo | null>(null);

  const columns = [
    { id: 'todo', title: 'To Do', items: todos.filter(t => !t.completed) },
    { id: 'inProgress', title: 'In Progress', items: todos.filter(t => t.startTime && !t.completed) },
    { id: 'completed', title: 'Completed', items: todos.filter(t => t.completed) }
  ];

  const handleDragStart = (todo: Todo) => {
    setDraggedTodo(todo);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (columnId: string) => {
    if (!draggedTodo) return;

    const updates: Partial<Todo> = {};
    
    if (columnId === 'completed') {
      updates.completed = true;
      updates.completedAt = new Date().toISOString();
    } else if (columnId === 'inProgress') {
      updates.startTime = new Date().toISOString();
      updates.completed = false;
      updates.completedAt = undefined;
    } else {
      updates.startTime = undefined;
      updates.completed = false;
      updates.completedAt = undefined;
    }

    await updateTodo(draggedTodo.id, updates);
    setDraggedTodo(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map(column => (
        <div
          key={column.id}
          className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(column.id)}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
              {column.title}
            </h3>
            <span className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm">
              {column.items.length}
            </span>
          </div>

          <div className="space-y-3">
            {column.items.map(todo => (
              <div
                key={todo.id}
                draggable
                onDragStart={() => handleDragStart(todo)}
                className={`bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm cursor-move
                  ${todo.priority === 'high' ? 'border-l-4 border-red-500' :
                    todo.priority === 'medium' ? 'border-l-4 border-yellow-500' :
                    'border-l-4 border-green-500'}`}
              >
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {todo.title}
                  </h4>
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {todo.description && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {todo.description}
                  </p>
                )}

                <div className="mt-3 flex items-center gap-2">
                  {todo.category && (
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                      {todo.category}
                    </span>
                  )}
                  {todo.dueDate && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Due {new Date(todo.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {column.id === 'todo' && (
              <button
                onClick={() => document.getElementById('add-todo-button')?.click()}
                className="w-full p-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Task
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};