/*
  # Task Management Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Maps to auth.users
      - `email` (text)
      - `created_at` (timestamp)
      - `last_active` (timestamp)
      - `preferences` (jsonb) - User preferences like theme, notifications

    - `tasks`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References users.id
      - `google_drive_id` (text) - Reference to Google Drive file
      - `title` (text)
      - `description` (text)
      - `priority` (text) - 'low', 'medium', 'high'
      - `is_pinned` (boolean)
      - `is_starred` (boolean)
      - `due_date` (timestamp)
      - `completed_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `category` (text)
      - `tags` (text[])
      - `metadata` (jsonb) - Additional task data (recurring patterns, etc)

    - `task_attachments`
      - `id` (uuid, primary key)
      - `task_id` (uuid) - References tasks.id
      - `name` (text)
      - `url` (text)
      - `type` (text)
      - `created_at` (timestamp)

    - `task_comments`
      - `id` (uuid, primary key)
      - `task_id` (uuid) - References tasks.id
      - `user_id` (uuid) - References users.id
      - `content` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now(),
  preferences jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  google_drive_id text,
  title text NOT NULL,
  description text,
  priority text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  is_pinned boolean DEFAULT false,
  is_starred boolean DEFAULT false,
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  category text,
  tags text[],
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create task_attachments table
CREATE TABLE IF NOT EXISTS task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own task attachments"
  ON task_attachments
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks 
    WHERE tasks.id = task_attachments.task_id 
    AND tasks.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks 
    WHERE tasks.id = task_attachments.task_id 
    AND tasks.user_id = auth.uid()
  ));

-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own task comments"
  ON task_comments
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks 
    WHERE tasks.id = task_comments.task_id 
    AND tasks.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks 
    WHERE tasks.id = task_comments.task_id 
    AND tasks.user_id = auth.uid()
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);
CREATE INDEX IF NOT EXISTS tasks_completed_at_idx ON tasks(completed_at);
CREATE INDEX IF NOT EXISTS task_attachments_task_id_idx ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS task_comments_task_id_idx ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS task_comments_user_id_idx ON task_comments(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();