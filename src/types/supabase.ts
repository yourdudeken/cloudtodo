export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          last_active: string
          preferences: Json
        }
        Insert: {
          id: string
          email: string
          created_at?: string
          last_active?: string
          preferences?: Json
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          last_active?: string
          preferences?: Json
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          google_drive_id: string | null
          title: string
          description: string | null
          priority: 'low' | 'medium' | 'high'
          is_pinned: boolean
          is_starred: boolean
          due_date: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
          category: string | null
          tags: string[]
          metadata: Json
        }
        Insert: {
          id?: string
          user_id: string
          google_drive_id?: string | null
          title: string
          description?: string | null
          priority?: 'low' | 'medium' | 'high'
          is_pinned?: boolean
          is_starred?: boolean
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
          category?: string | null
          tags?: string[]
          metadata?: Json
        }
        Update: {
          id?: string
          user_id?: string
          google_drive_id?: string | null
          title?: string
          description?: string | null
          priority?: 'low' | 'medium' | 'high'
          is_pinned?: boolean
          is_starred?: boolean
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
          category?: string | null
          tags?: string[]
          metadata?: Json
        }
      }
      task_attachments: {
        Row: {
          id: string
          task_id: string
          name: string
          url: string
          type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          name: string
          url: string
          type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          name?: string
          url?: string
          type?: string | null
          created_at?: string
        }
      }
      task_comments: {
        Row: {
          id: string
          task_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }
    }
  }
}