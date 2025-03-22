/*
  # Add collaboration features

  1. New Tables
    - `task_collaborators`
      - `id` (uuid, primary key)
      - `task_id` (uuid)
      - `user_id` (uuid, references auth.users)
      - `role` (text, either 'viewer' or 'editor')
      - `created_at` (timestamp)
    
    - `task_comments`
      - `id` (uuid, primary key)
      - `task_id` (uuid)
      - `user_id` (uuid, references auth.users)
      - `content` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for task collaborators and comments
*/

-- Create task_collaborators table
CREATE TABLE IF NOT EXISTS task_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('viewer', 'editor')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (task_id, user_id)
);

-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE task_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their task collaborations" ON task_collaborators;
    DROP POLICY IF EXISTS "Users can add collaborators to their tasks" ON task_collaborators;
    DROP POLICY IF EXISTS "Users can view comments on their tasks" ON task_comments;
    DROP POLICY IF EXISTS "Users can add comments to tasks they collaborate on" ON task_comments;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Policies for task_collaborators
CREATE POLICY "Users can view their task collaborations"
  ON task_collaborators
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    task_id IN (
      SELECT task_id FROM task_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add collaborators to their tasks"
  ON task_collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT task_id FROM task_collaborators WHERE user_id = auth.uid() AND role = 'editor'
    )
  );

-- Policies for task_comments
CREATE POLICY "Users can view comments on their tasks"
  ON task_comments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    task_id IN (
      SELECT task_id FROM task_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add comments to tasks they collaborate on"
  ON task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT task_id FROM task_collaborators WHERE user_id = auth.uid()
    )
  );