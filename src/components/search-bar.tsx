import React from 'react';
//import * as Dialog from '@radix-ui/react-dialog';
import { Search, X } from 'lucide-react';
//import { Button } from '@/components/ui/button';
import { useTaskStore } from '@/store/tasks';
import { TaskDetail } from './task-detail';

export function SearchBar() {
  const [query, setQuery] = React.useState('');
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  const tasks = useTaskStore((state) => state.tasks);

  const filteredTasks = React.useMemo(() => {
    if (!query) return [];
    const searchTerms = query.toLowerCase().split(' ');
    
    return tasks.filter(task => {
      const searchText = `${task.taskTitle} ${task.description || ''} ${task.categories?.join(' ') || ''} ${task.tags?.join(' ') || ''}`.toLowerCase();
      return searchTerms.every(term => searchText.includes(term));
    });
  }, [query, tasks]);

  return (
    <div className="relative w-full max-w-2xl mx-auto mb-8">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {/* The search icon is already present in the input field */}
        {/* If a separate button is desired, it could be added here */}
        {/* Example: 
        <Button variant="ghost" size="icon" disabled={!query}>
          <Search className="h-4 w-4" />
        </Button> 
        */}
        {/* For now, removing the AI button simplifies the UI as requested */}
      </div>

      {/* Search Results */}
      {query && filteredTasks.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border p-2 max-h-[300px] overflow-y-auto z-50">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="p-2 hover:bg-gray-50 rounded cursor-pointer"
              onClick={() => task.id && setSelectedTaskId(task.id)}
            >
              <div className="font-medium">{task.taskTitle}</div>
              {task.description && (
                <div className="text-sm text-gray-500 truncate">
                  {task.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Task Detail Dialog */}
      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
