import brain from 'brain.js';
import { differenceInMinutes } from 'date-fns';
import { Todo } from '../types/todo';

// Neural network for priority prediction
const priorityNet = new brain.NeuralNetwork();

// Neural network for completion time prediction
const timeNet = new brain.NeuralNetwork();

interface TaskData {
  taskName: string;
  timeTaken: number;
  timestamp: string;
}

// Load historical task data from localStorage
const getTaskHistory = (): TaskData[] => {
  return JSON.parse(localStorage.getItem('taskData') || '[]');
};

// Log task completion data
export const logTaskCompletion = (taskName: string, timeTaken: number) => {
  const data = getTaskHistory();
  data.push({ taskName, timeTaken, timestamp: new Date().toISOString() });
  localStorage.setItem('taskData', JSON.stringify(data));
  trainNetworks(); // Retrain networks with new data
};

// Prepare training data for priority prediction
const preparePriorityTrainingData = (todos: Todo[]) => {
  return todos
    .filter(todo => todo.completed)
    .map(todo => ({
      input: {
        dueDate: todo.dueDate ? differenceInMinutes(new Date(todo.dueDate), new Date()) / (24 * 60) : 0,
        isRecurring: todo.isRecurring ? 1 : 0,
        hasSubtasks: todo.subtasks.length > 0 ? 1 : 0,
        isStarred: todo.isStarred ? 1 : 0,
        isPinned: todo.isPinned ? 1 : 0,
      },
      output: {
        priority: todo.priority === 'high' ? 1 : todo.priority === 'medium' ? 0.5 : 0,
      },
    }));
};

// Prepare training data for completion time prediction
const prepareTimeTrainingData = () => {
  const history = getTaskHistory();
  return history.map(entry => ({
    input: {
      taskNameLength: entry.taskName.length / 100, // Normalize task name length
      hour: new Date(entry.timestamp).getHours() / 24, // Normalize hour
      dayOfWeek: new Date(entry.timestamp).getDay() / 7, // Normalize day
    },
    output: {
      timeTaken: entry.timeTaken / 480, // Normalize time taken (max 8 hours)
    },
  }));
};

// Train both neural networks
export const trainNetworks = (todos: Todo[] = []) => {
  // Train priority network
  const priorityTrainingData = preparePriorityTrainingData(todos);
  if (priorityTrainingData.length > 0) {
    priorityNet.train(priorityTrainingData, {
      iterations: 1000,
      errorThresh: 0.005,
    });
  }

  // Train time prediction network
  const timeTrainingData = prepareTimeTrainingData();
  if (timeTrainingData.length > 0) {
    timeNet.train(timeTrainingData, {
      iterations: 1000,
      errorThresh: 0.005,
    });
  }
};

// Predict priority for a new task
export const predictPriority = (todo: Partial<Todo>): number => {
  const input = {
    dueDate: todo.dueDate ? differenceInMinutes(new Date(todo.dueDate), new Date()) / (24 * 60) : 0,
    isRecurring: todo.isRecurring ? 1 : 0,
    hasSubtasks: todo.subtasks?.length ? 1 : 0,
    isStarred: todo.isStarred ? 1 : 0,
    isPinned: todo.isPinned ? 1 : 0,
  };

  const result = priorityNet.run(input);
  return result.priority;
};

// Predict completion time for a task
export const predictCompletionTime = (taskName: string): number => {
  const input = {
    taskNameLength: taskName.length / 100,
    hour: new Date().getHours() / 24,
    dayOfWeek: new Date().getDay() / 7,
  };

  const result = timeNet.run(input);
  return Math.round(result.timeTaken * 480); // Convert back to minutes
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