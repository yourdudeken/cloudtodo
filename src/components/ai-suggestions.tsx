import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { useTaskStore } from '@/store/tasks';
import { AISuggestionsService, TaskSuggestion, TaskUpdate } from '@/lib/ai-suggestions';
import { Sparkles, Plus, RefreshCw, Lightbulb, X, AlertTriangle } from 'lucide-react';

export function AISuggestions() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<TaskSuggestion[]>([]);
  const [summary, setSummary] = React.useState('');
  const { tasks, addTask, updateTask } = useTaskStore();

  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const [newSuggestions, taskSummary] = await Promise.all([
        AISuggestionsService.suggestTasks(tasks),
        AISuggestionsService.generateTaskSummary(tasks)
      ]);
      setSuggestions(newSuggestions);
      setSummary(taskSummary);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while loading suggestions');
    }
    setLoading(false);
  };

  const handleAddSuggestion = (suggestion: TaskSuggestion) => {
    addTask({
      ...suggestion,
      completed: false,
      projectId: 'inbox'
    });
    setSuggestions(suggestions.filter(s => s.title !== suggestion.title));
  };

  const handleImproveTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setLoading(true);
    setError(null);
    try {
      const updates = await AISuggestionsService.suggestTaskUpdates(task);
      if (Object.keys(updates).length > 0) {
        updateTask(taskId, updates);
      }
    } catch (error) {
      console.error('Error improving task:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while improving the task');
    }
    setLoading(false);
  };

  return (
    <>
      <Button
        onClick={() => {
          setIsOpen(true);
          loadSuggestions();
        }}
        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
      >
        <Sparkles className="h-4 w-4" />
        AI Suggestions
      </Button>

      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI Suggestions
              </h2>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>

            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="font-medium">Configuration Error</h3>
                </div>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 text-purple-600 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {summary && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-purple-600" />
                      Task Analysis
                    </h3>
                    <p className="text-sm text-gray-600">{summary}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="font-medium">Suggested Tasks</h3>
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-medium">{suggestion.title}</h4>
                          {suggestion.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {suggestion.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {suggestion.category && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {suggestion.category}
                              </span>
                            )}
                            {suggestion.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddSuggestion(suggestion)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Improve Existing Tasks</h3>
                  <div className="space-y-2">
                    {tasks.slice(0, 5).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                      >
                        <span className="text-sm truncate">{task.title}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleImproveTask(task.id)}
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          Improve
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}