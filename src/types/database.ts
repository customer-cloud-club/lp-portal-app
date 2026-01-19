/**
 * Database type definitions generated from Supabase schema
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      projects: {
        Row: Project;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
      };
      tasks: {
        Row: Task;
        Insert: TaskInsert;
        Update: TaskUpdate;
      };
      comments: {
        Row: Comment;
        Insert: CommentInsert;
        Update: CommentUpdate;
      };
      project_members: {
        Row: ProjectMember;
        Insert: ProjectMemberInsert;
        Update: ProjectMemberUpdate;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'user' | 'admin' | 'moderator';
      project_status: 'active' | 'archived' | 'draft';
      task_status: 'todo' | 'in_progress' | 'done' | 'cancelled';
      member_role: 'owner' | 'admin' | 'member' | 'viewer';
    };
  };
}

/**
 * Profile interface representing a user profile
 */
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Database['public']['Enums']['user_role'];
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: Database['public']['Enums']['user_role'];
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  id?: string;
  email?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: Database['public']['Enums']['user_role'];
  created_at?: string;
  updated_at?: string;
}

/**
 * Project interface representing a project
 */
export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  status: Database['public']['Enums']['project_status'];
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProjectInsert {
  id?: string;
  name: string;
  description?: string | null;
  owner_id: string;
  status?: Database['public']['Enums']['project_status'];
  settings?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectUpdate {
  id?: string;
  name?: string;
  description?: string | null;
  owner_id?: string;
  status?: Database['public']['Enums']['project_status'];
  settings?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Task interface representing a task within a project
 */
export interface Task {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  assignee_id: string | null;
  status: Database['public']['Enums']['task_status'];
  priority: number;
  due_date: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TaskInsert {
  id?: string;
  title: string;
  description?: string | null;
  project_id?: string | null;
  assignee_id?: string | null;
  status?: Database['public']['Enums']['task_status'];
  priority?: number;
  due_date?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface TaskUpdate {
  id?: string;
  title?: string;
  description?: string | null;
  project_id?: string | null;
  assignee_id?: string | null;
  status?: Database['public']['Enums']['task_status'];
  priority?: number;
  due_date?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Comment interface representing a comment on a task
 */
export interface Comment {
  id: string;
  content: string;
  task_id: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export interface CommentInsert {
  id?: string;
  content: string;
  task_id?: string | null;
  author_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface CommentUpdate {
  id?: string;
  content?: string;
  task_id?: string | null;
  author_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * ProjectMember interface representing project membership
 */
export interface ProjectMember {
  id: string;
  project_id: string | null;
  user_id: string | null;
  role: Database['public']['Enums']['member_role'];
  joined_at: string;
}

export interface ProjectMemberInsert {
  id?: string;
  project_id?: string | null;
  user_id?: string | null;
  role?: Database['public']['Enums']['member_role'];
  joined_at?: string;
}

export interface ProjectMemberUpdate {
  id?: string;
  project_id?: string | null;
  user_id?: string | null;
  role?: Database['public']['Enums']['member_role'];
  joined_at?: string;
}
