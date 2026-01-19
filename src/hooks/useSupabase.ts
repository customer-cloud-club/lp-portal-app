/**
 * Custom React hooks for Supabase operations
 */

import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, db } from '../lib/supabase';
import { Database } from '../types/database';

/**
 * Hook for managing authentication state
 * @returns Authentication state and methods
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setError(error);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      setError(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      setError(error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, unknown>) => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      if (error) throw error;
    } catch (error) {
      setError(error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      setError(error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
  };
}

/**
 * Hook for managing user profile data
 * @param userId - User ID to fetch profile for
 * @returns Profile state and methods
 */
export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<Database['public']['Tables']['profiles']['Row'] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await db.getProfile(id);
      setProfile(profileData);
    } catch (error) {
      setError(error as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Database['public']['Tables']['profiles']['Update']) => {
    if (!profile) return;
    
    try {
      setLoading(true);
      setError(null);
      const updatedProfile = await db.upsertProfile({ ...profile, ...updates });
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (error) {
      setError(error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (userId) {
      fetchProfile(userId);
    }
  }, [userId, fetchProfile]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: () => userId && fetchProfile(userId),
  };
}

/**
 * Hook for managing projects data
 * @returns Projects state and methods
 */
export function useProjects() {
  const [projects, setProjects] = useState<Database['public']['Tables']['projects']['Row'][]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const projectsData = await db.getUserProjects();
      setProjects(projectsData);
    } catch (error) {
      setError(error as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (project: Database['public']['Tables']['projects']['Insert']) => {
    try {
      setError(null);
      const newProject = await db.createProject(project);
      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    createProject,
    refetch: fetchProjects,
  };
}

/**
 * Hook for managing tasks data for a specific project
 * @param projectId - Project ID to fetch tasks for
 * @returns Tasks state and methods
 */
export function useTasks(projectId?: string) {
  const [tasks, setTasks] = useState<Database['public']['Tables']['tasks']['Row'][]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const tasksData = await db.getProjectTasks(id);
      setTasks(tasksData);
    } catch (error) {
      setError(error as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (task: Database['public']['Tables']['tasks']['Insert']) => {
    try {
      setError(null);
      const newTask = await db.createTask(task);
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, []);

  const updateTaskStatus = useCallback(async (taskId: string, status: Database['public']['Enums']['task_status']) => {
    try {
      setError(null);
      const updatedTask = await db.updateTaskStatus(taskId, status);
      setTasks(prev => prev.map(task => 
        task.id === taskId ? updatedTask : task
      ));
      return updatedTask;
    } catch (error) {
      setError(error as Error);
      throw error;
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchTasks(projectId);
    }
  }, [projectId, fetchTasks]);

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTaskStatus,
    refetch: () => projectId && fetchTasks(projectId),
  };
}
