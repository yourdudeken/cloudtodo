import { differenceInMinutes } from 'date-fns';
import { Todo } from '../types/todo';

interface TaskData {
  taskName: string;
  timeTaken: number;
  timestamp: string;
}

// Simple priority scoring system
const calculatePriorityScore = (todo: Partial<Todo>): number => {
  let score = 0.5; // Default medium priority

  if (todo.dueDate) {
    const daysUntilDue = differenceInMinutes(new Date(todo.dueDate), new Date()) / (24 * 60);
    if (daysUntilDue <= 1) score += 0.3;
    else if (daysUntilDue <= 3) score += 0.2;
    else if (daysUntilDue <= 7) score += 0.1;
  }

  if (todo.isRecurring) score -= 0.1;
  if (todo.subtasks?.length) score += 0.1;
  if (todo.isStarred) score += 0.1;
  if (todo.isPinned) score += 0.2;

  return Math.min(Math.max(score, 0), 1); // Ensure score is between 0 and 1
};

// Load historical task data from localStorage
const getTaskHistory = (): TaskData[] => {
  return JSON.parse(localStorage.getItem('taskData') || '[]');
};

// Save task data to localStorage
const saveTaskHistory = (data: TaskData[]) => {
  localStorage.setItem('taskData', JSON.stringify(data));
};

// Log task completion data
export const logTaskCompletion = (taskName: string, timeTaken: number) => {
  const data = getTaskHistory();
  data.push({ taskName, timeTaken, timestamp: new Date().toISOString() });
  saveTaskHistory(data);
};

// Predict priority for a new task
export const predictPriority = (todo: Partial<Todo>): number => {
  return calculatePriorityScore(todo);
};

// Predict completion time based on similar tasks
export const predictCompletionTime = (taskName: string): number => {
  const history = getTaskHistory();
  const similarTasks = history.filter(task => 
    task.taskName.toLowerCase().includes(taskName.toLowerCase()) ||
    taskName.toLowerCase().includes(task.taskName.toLowerCase())
  );

  if (similarTasks.length === 0) return 30; // Default 30 minutes

  // Calculate average completion time
  const totalTime = similarTasks.reduce((sum, task) => sum + task.timeTaken, 0);
  return Math.round(totalTime / similarTasks.length);
};

// Generate task suggestions based on patterns
export const generateSuggestions = (todos: Todo[]): string[] => {
  const history = getTaskHistory();
  const dayOfWeek = new Date().getDay();
  const hour = new Date().getHours();

  // Find tasks that are commonly done on this day and hour
  const commonTasks = history.filter(entry => {
    const taskDate = new Date(entry.timestamp);
    return taskDate.getDay() === dayOfWeek && 
           Math.abs(taskDate.getHours() - hour) <= 2;
  });

  // Get unique task names and their frequencies
  const taskFrequency = commonTasks.reduce((acc, entry) => {
    acc[entry.taskName] = (acc[entry.taskName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter out tasks that already exist in the current todo list
  const currentTaskNames = new Set(todos.map(todo => todo.title));
  
  return Object.entries(taskFrequency)
    .filter(([taskName]) => !currentTaskNames.has(taskName))
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([taskName]) => taskName);
};

// Initialize or train the system
export const trainNetworks = (todos: Todo[] = []) => {
  // No training needed for this simplified version
  return;
};