import OpenAI from 'openai';
import { Task } from '@/store/tasks';

// Check if API key exists and throw a more user-friendly error if missing
const getOpenAIInstance = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your .env file.'
    );
  }
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });
};

export interface TaskSuggestion {
  title: string;
  description?: string;
  priority?: 1 | 2 | 3 | 4;
  category?: string;
  tags?: string[];
  dueDate?: Date;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  priority?: 1 | 2 | 3 | 4;
  category?: string;
  tags?: string[];
  dueDate?: Date;
}

export class AISuggestionsService {
  static async searchTasks(query: string, tasks: Task[]): Promise<string[]> {
    try {
      const openai = getOpenAIInstance();
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a task management AI assistant. Help users find and understand their tasks by providing intelligent search results and insights."
          },
          {
            role: "user",
            content: `Search query: "${query}"\n\nAvailable tasks: ${JSON.stringify(tasks, null, 2)}\n\nProvide relevant insights, suggestions, and task groupings based on the search query.`
          }
        ]
      });

      const content = completion.choices[0].message.content;
      if (!content) return [];

      // Split the content into separate insights
      return content.split('\n').filter(line => line.trim());
    } catch (error) {
      console.error('Error searching tasks:', error);
      if (error instanceof Error && error.message.includes('API key')) {
        throw new Error('OpenAI API key is not properly configured. Please check your environment settings.');
      }
      return [];
    }
  }

  static async suggestTasks(existingTasks: Task[]): Promise<TaskSuggestion[]> {
    try {
      const openai = getOpenAIInstance();
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a task management AI assistant. Based on the user's existing tasks, suggest new related tasks that might be helpful. Focus on practical, actionable suggestions."
          },
          {
            role: "user",
            content: `Here are my current tasks: ${JSON.stringify(existingTasks, null, 2)}. Please suggest 2-3 related tasks that might be helpful.`
          }
        ],
        functions: [
          {
            name: "suggest_tasks",
            description: "Suggest new tasks based on existing ones",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      priority: { type: "number", enum: [1, 2, 3, 4] },
                      category: { type: "string" },
                      tags: { type: "array", items: { type: "string" } },
                      dueDate: { type: "string", format: "date-time" }
                    },
                    required: ["title"]
                  }
                }
              }
            }
          }
        ],
        function_call: { name: "suggest_tasks" }
      });

      const result = completion.choices[0].message.function_call?.arguments;
      if (!result) return [];

      const { suggestions } = JSON.parse(result);
      return suggestions.map((s: any) => ({
        ...s,
        dueDate: s.dueDate ? new Date(s.dueDate) : undefined
      }));
    } catch (error) {
      console.error('Error getting task suggestions:', error);
      if (error instanceof Error && error.message.includes('API key')) {
        throw new Error('OpenAI API key is not properly configured. Please check your environment settings.');
      }
      return [];
    }
  }

  static async suggestTaskUpdates(task: Task): Promise<TaskUpdate> {
    try {
      const openai = getOpenAIInstance();
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a task management AI assistant. Analyze the given task and suggest improvements or updates to make it more effective and actionable."
          },
          {
            role: "user",
            content: `Please analyze this task and suggest improvements: ${JSON.stringify(task, null, 2)}`
          }
        ],
        functions: [
          {
            name: "suggest_updates",
            description: "Suggest updates to improve the task",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "number", enum: [1, 2, 3, 4] },
                category: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                dueDate: { type: "string", format: "date-time" }
              }
            }
          }
        ],
        function_call: { name: "suggest_updates" }
      });

      const result = completion.choices[0].message.function_call?.arguments;
      if (!result) return {};

      const updates = JSON.parse(result);
      return {
        ...updates,
        dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined
      };
    } catch (error) {
      console.error('Error getting task update suggestions:', error);
      if (error instanceof Error && error.message.includes('API key')) {
        throw new Error('OpenAI API key is not properly configured. Please check your environment settings.');
      }
      return {};
    }
  }

  static async generateTaskSummary(tasks: Task[]): Promise<string> {
    try {
      const openai = getOpenAIInstance();
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a task management AI assistant. Analyze the given tasks and provide a concise summary of progress, priorities, and key insights."
          },
          {
            role: "user",
            content: `Please analyze these tasks and provide a summary: ${JSON.stringify(tasks, null, 2)}`
          }
        ]
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      console.error('Error generating task summary:', error);
      if (error instanceof Error && error.message.includes('API key')) {
        throw new Error('OpenAI API key is not properly configured. Please check your environment settings.');
      }
      return '';
    }
  }
}