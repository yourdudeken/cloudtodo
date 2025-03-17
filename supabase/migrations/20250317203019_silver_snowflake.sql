/*
  # Add notification preferences and email templates

  1. New Tables
    - `notification_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `type` (text, notification type)
      - `enabled` (boolean)
      - `created_at` (timestamp)
    
    - `email_templates`
      - `id` (uuid, primary key)
      - `name` (text)
      - `subject` (text)
      - `content` (text)
      - `created_at` (timestamp)

  2. Changes
    - Add `reminder_at` column to tasks table
    - Add notification trigger for tasks

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Add reminder_at column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_at timestamptz;

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('due_date', 'reminder', 'status_change', 'comment')),
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their notification preferences"
  ON notification_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  subject text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Insert default email templates
INSERT INTO email_templates (name, subject, content) VALUES
  ('task_due', '📅 Task Due: {{task_title}}',
   '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">Task Due Reminder</h2>
      <p>Hello {{user_name}},</p>
      <p>Your task "{{task_title}}" is due {{due_date}}.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Priority:</strong> {{priority}}</p>
        <p style="margin: 10px 0 0;"><strong>Description:</strong> {{description}}</p>
      </div>
      <a href="{{task_url}}" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a>
    </div>'),
  
  ('task_reminder', '⏰ Reminder: {{task_title}}',
   '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">Task Reminder</h2>
      <p>Hello {{user_name}},</p>
      <p>This is a reminder for your task "{{task_title}}".</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Due Date:</strong> {{due_date}}</p>
        <p style="margin: 10px 0 0;"><strong>Priority:</strong> {{priority}}</p>
      </div>
      <a href="{{task_url}}" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a>
    </div>');

-- Create function to handle task notifications
CREATE OR REPLACE FUNCTION handle_task_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email text;
  v_user_name text;
  v_template email_templates;
  v_notification_enabled boolean;
BEGIN
  -- Get user email and name
  SELECT email, COALESCE(preferences->>'name', email) INTO v_user_email, v_user_name
  FROM users
  WHERE id = NEW.user_id;

  -- Check if notifications are enabled for this type
  SELECT enabled INTO v_notification_enabled
  FROM notification_preferences
  WHERE user_id = NEW.user_id
    AND type = CASE
      WHEN NEW.reminder_at IS NOT NULL THEN 'reminder'
      WHEN NEW.due_date IS NOT NULL THEN 'due_date'
      ELSE NULL
    END;

  -- If notifications are enabled, send email
  IF v_notification_enabled THEN
    -- Get appropriate email template
    SELECT * INTO v_template
    FROM email_templates
    WHERE name = CASE
      WHEN NEW.reminder_at IS NOT NULL THEN 'task_reminder'
      WHEN NEW.due_date IS NOT NULL THEN 'task_due'
      ELSE NULL
    END;

    -- Send email using Supabase Edge Functions
    IF v_template.id IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', current_setting('request.headers')::json->>'authorization'
        ),
        body := jsonb_build_object(
          'to', v_user_email,
          'subject', replace(v_template.subject, '{{task_title}}', NEW.title),
          'html', replace(
            replace(
              replace(
                replace(
                  replace(
                    v_template.content,
                    '{{user_name}}', v_user_name
                  ),
                  '{{task_title}}', NEW.title
                ),
                '{{due_date}}', to_char(COALESCE(NEW.reminder_at, NEW.due_date), 'DD Mon YYYY HH24:MI')
              ),
              '{{priority}}', NEW.priority
            ),
            '{{description}}', COALESCE(NEW.description, '')
          )
        )::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for task notifications
DROP TRIGGER IF EXISTS task_notification_trigger ON tasks;
CREATE TRIGGER task_notification_trigger
  AFTER INSERT OR UPDATE OF due_date, reminder_at
  ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION handle_task_notification();

-- Add default notification preferences for new users
CREATE OR REPLACE FUNCTION add_default_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notification_preferences (user_id, type, enabled)
  VALUES
    (NEW.id, 'due_date', true),
    (NEW.id, 'reminder', true),
    (NEW.id, 'status_change', true),
    (NEW.id, 'comment', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS add_default_notification_preferences_trigger ON users;
CREATE TRIGGER add_default_notification_preferences_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION add_default_notification_preferences();