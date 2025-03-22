import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTaskStore } from '@/store/tasks';
import { AISuggestionsService } from '@/lib/ai-suggestions';
import { TaskDetail } from './task-detail';

export function SearchBar() {
  const [query, setQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [showAIResults, setShowAIResults] = React.useState(false);
  const [aiSuggestions, setAISuggestions] = React.useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  const tasks = useTaskStore((state) => state.tasks);

  const filteredTasks = React.useMemo(() => {
    if (!query) return [];
    const searchTerms = query.toLowerCase().split(' ');
    
    return tasks.filter(task => {
      const searchText = `${task.title} ${task.description || ''} ${task.category || ''} ${task.tags?.join(' ') || ''}`.toLowerCase();
      return searchTerms.every(term => searchText.includes(term));
    });
  }, [query, tasks]);

  const handleAISearch = async () => {
    setIsSearching(true);
    try {
      const completion = await AISuggestionsService.searchTasks(query, tasks);
      setAISuggestions(completion);
      setShowAIResults(true);
    } catch (error) {
      console.error('Error with AI search:', error);
    }
    setIsSearching(false);
  };

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
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          onClick={handleAISearch}
          disabled={!query || isSearching}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          AI Search
        </Button>
      </div>

      {/* Search Results */}
      {query && filteredTasks.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border p-2 max-h-[300px] overflow-y-auto z-50">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="p-2 hover:bg-gray-50 rounded cursor-pointer"
              onClick={() => setSelectedTaskId(task.id)}
            >
              <div className="font-medium">{task.title}</div>
              {task.description && (
                <div className="text-sm text-gray-500 truncate">
                  {task.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Results Dialog */}
      <Dialog.Root open={showAIResults} onOpenChange={setShowAIResults}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                AI Search Results
              </h2>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
            
            <div className="space-y-4">
              {aiSuggestions.map((suggestion, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  {suggestion}
                </div>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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