/*
  # Enhance Task Collaboration System

  1. Changes
    - Add tasks table with ownership tracking
    - Add task ownership transfer capability
    - Improve collaboration policies
    - Add task activity tracking

  2. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `owner_id` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `task_activity`
      - `id` (uuid, primary key)
      - `task_id` (uuid)
      - `user_id` (uuid)
      - `action` (text)
      - `details` (jsonb)
      - `created_at` (timestamp)

  3. Security
    - RLS policies for task ownership
    - Activity logging policies
    - Improved collaboration policies
*/

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task activity table
CREATE TABLE IF NOT EXISTS task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;

-- Update task_collaborators to reference tasks
ALTER TABLE task_collaborators
ADD CONSTRAINT task_collaborators_task_id_fkey
FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE task_comments
ADD CONSTRAINT task_comments_task_id_fkey
FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- Task Policies
CREATE POLICY "Users can view owned and collaborated tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR 
    id IN (
      SELECT task_id FROM task_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners and editors can update tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT task_id 
      FROM task_collaborators 
      WHERE user_id = auth.uid() AND role = 'editor'
    )
  );

CREATE POLICY "Only owners can delete tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Activity Policies
CREATE POLICY "Users can view activity for their tasks"
  ON task_activity
  FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE owner_id = auth.uid()
      UNION
      SELECT task_id FROM task_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activity records"
  ON task_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE owner_id = auth.uid()
      UNION
      SELECT task_id FROM task_collaborators WHERE user_id = auth.uid()
    )
  );

-- Functions
CREATE OR REPLACE FUNCTION update_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_updated_at();

-- Function to log task activity
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO task_activity (task_id, user_id, action, details)
  VALUES (
    NEW.id,
    auth.uid(),
    CASE
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' THEN 'updated'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
    END,
    CASE
      WHEN TG_OP = 'UPDATE' THEN 
        jsonb_build_object(
          'changes',
          jsonb_build_object(
            'title', CASE WHEN NEW.title <> OLD.title THEN jsonb_build_object('old', OLD.title, 'new', NEW.title) ELSE NULL END,
            'description', CASE WHEN NEW.description <> OLD.description THEN jsonb_build_object('old', OLD.description, 'new', NEW.description) ELSE NULL END
          )
        )
      ELSE '{}'::jsonb
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_task_changes
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_activity();