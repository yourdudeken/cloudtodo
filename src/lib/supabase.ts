import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getNotificationPreferences = async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error('No user logged in');

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id);

  if (error) throw error;
  return data;
};

export const updateNotificationPreferences = async (type: string, enabled: boolean) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('No user logged in');

  const { data, error } = await supabase
    .from('notification_preferences')
    .update({ enabled })
    .eq('user_id', user.id)
    .eq('type', type)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const syncTaskWithSupabase = async (task: any) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('No user logged in');

  const { data, error } = await supabase
    .from('tasks')
    .upsert({
      id: task.id,
      user_id: user.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      is_pinned: task.isPinned,
      is_starred: task.isStarred,
      due_date: task.dueDate,
      reminder: task.reminder,
      completed_at: task.completedAt,
      category: task.category,
      tags: task.tags,
      metadata: {
        recurringPattern: task.recurringPattern,
        predictedDuration: task.predictedDuration,
        actualDuration: task.actualDuration,
        startTime: task.startTime,
      }
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const fetchUserTasks = async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error('No user logged in');

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_attachments (*),
      task_comments (
        *,
        users (
          email
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const updateTaskStatus = async (taskId: string, updates: any) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const addTaskComment = async (taskId: string, content: string) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('No user logged in');

  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      user_id: user.id,
      content
    })
    .select(`
      *,
      users (
        email
      )
    `)
    .single();

  if (error) throw error;
  return data;
};

export const addTaskAttachment = async (taskId: string, attachment: any) => {
  const { data, error } = await supabase
    .from('task_attachments')
    .insert({
      task_id: taskId,
      name: attachment.name,
      url: attachment.url,
      type: attachment.type
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateUserPreferences = async (preferences: any) => {
  const user = await getCurrentUser();
  if (!user) throw new Error('No user logged in');

  const { data, error } = await supabase
    .from('users')
    .update({ preferences })
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
};