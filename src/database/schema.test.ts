/**
 * Tests for database schema types
 */

import { Database, Tables, TablesInsert, TablesUpdate } from './schema';

describe('Database Schema Types', () => {
  describe('Database interface', () => {
    it('should have correct structure', () => {
      // Type-only test - if this compiles, the types are correct
      const mockDatabase: Database = {
        public: {
          Tables: {
            users: {
              Row: {
                id: 'test-id',
                email: 'test@example.com',
                full_name: 'Test User',
                avatar_url: 'https://example.com/avatar.jpg',
                created_at: '2023-01-01T00:00:00Z',
                updated_at: '2023-01-01T00:00:00Z'
              },
              Insert: {
                email: 'test@example.com'
              },
              Update: {
                full_name: 'Updated Name'
              }
            },
            projects: {
              Row: {
                id: 'project-id',
                title: 'Test Project',
                description: 'Test Description',
                status: 'active',
                owner_id: 'user-id',
                created_at: '2023-01-01T00:00:00Z',
                updated_at: '2023-01-01T00:00:00Z'
              },
              Insert: {
                title: 'New Project',
                owner_id: 'user-id'
              },
              Update: {
                title: 'Updated Project'
              }
            },
            tasks: {
              Row: {
                id: 'task-id',
                title: 'Test Task',
                description: 'Test Description',
                status: 'todo',
                priority: 'medium',
                project_id: 'project-id',
                assignee_id: 'user-id',
                due_date: '2023-12-31T23:59:59Z',
                created_at: '2023-01-01T00:00:00Z',
                updated_at: '2023-01-01T00:00:00Z'
              },
              Insert: {
                title: 'New Task',
                project_id: 'project-id'
              },
              Update: {
                status: 'in_progress'
              }
            }
          },
          Views: {},
          Functions: {},
          Enums: {
            project_status: 'active',
            task_status: 'todo',
            task_priority: 'low'
          },
          CompositeTypes: {}
        }
      };

      expect(mockDatabase.public.Tables.users.Row.id).toBe('test-id');
      expect(mockDatabase.public.Tables.projects.Row.status).toBe('active');
      expect(mockDatabase.public.Tables.tasks.Row.priority).toBe('medium');
    });
  });

  describe('Tables type helper', () => {
    it('should extract correct Row types', () => {
      // Type-only test
      const user: Tables<'users'> = {
        id: 'test-id',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      expect(user.id).toBe('test-id');
      expect(user.email).toBe('test@example.com');
    });
  });

  describe('TablesInsert type helper', () => {
    it('should have correct insert types for users', () => {
      const userInsert: TablesInsert<'users'> = {
        email: 'new@example.com',
        full_name: 'New User'
      };

      expect(userInsert.email).toBe('new@example.com');
      expect(userInsert.full_name).toBe('New User');
    });

    it('should have correct insert types for projects', () => {
      const projectInsert: TablesInsert<'projects'> = {
        title: 'New Project',
        owner_id: 'user-id',
        status: 'active'
      };

      expect(projectInsert.title).toBe('New Project');
      expect(projectInsert.owner_id).toBe('user-id');
      expect(projectInsert.status).toBe('active');
    });

    it('should have correct insert types for tasks', () => {
      const taskInsert: TablesInsert<'tasks'> = {
        title: 'New Task',
        project_id: 'project-id',
        priority: 'high',
        status: 'todo'
      };

      expect(taskInsert.title).toBe('New Task');
      expect(taskInsert.project_id).toBe('project-id');
      expect(taskInsert.priority).toBe('high');
      expect(taskInsert.status).toBe('todo');
    });
  });

  describe('TablesUpdate type helper', () => {
    it('should have correct update types for users', () => {
      const userUpdate: TablesUpdate<'users'> = {
        full_name: 'Updated Name',
        avatar_url: 'https://new-avatar.com/image.jpg'
      };

      expect(userUpdate.full_name).toBe('Updated Name');
      expect(userUpdate.avatar_url).toBe('https://new-avatar.com/image.jpg');
    });

    it('should have correct update types for projects', () => {
      const projectUpdate: TablesUpdate<'projects'> = {
        title: 'Updated Project',
        status: 'completed',
        description: 'Updated description'
      };

      expect(projectUpdate.title).toBe('Updated Project');
      expect(projectUpdate.status).toBe('completed');
      expect(projectUpdate.description).toBe('Updated description');
    });

    it('should have correct update types for tasks', () => {
      const taskUpdate: TablesUpdate<'tasks'> = {
        status: 'done',
        priority: 'low',
        assignee_id: 'new-assignee'
      };

      expect(taskUpdate.status).toBe('done');
      expect(taskUpdate.priority).toBe('low');
      expect(taskUpdate.assignee_id).toBe('new-assignee');
    });
  });

  describe('Enum types', () => {
    it('should enforce project status enum', () => {
      const validStatuses: Array<Database['public']['Enums']['project_status']> = [
        'active',
        'completed',
        'archived'
      ];

      expect(validStatuses).toHaveLength(3);
      expect(validStatuses).toContain('active');
      expect(validStatuses).toContain('completed');
      expect(validStatuses).toContain('archived');
    });

    it('should enforce task status enum', () => {
      const validStatuses: Array<Database['public']['Enums']['task_status']> = [
        'todo',
        'in_progress',
        'done'
      ];

      expect(validStatuses).toHaveLength(3);
      expect(validStatuses).toContain('todo');
      expect(validStatuses).toContain('in_progress');
      expect(validStatuses).toContain('done');
    });

    it('should enforce task priority enum', () => {
      const validPriorities: Array<Database['public']['Enums']['task_priority']> = [
        'low',
        'medium',
        'high'
      ];

      expect(validPriorities).toHaveLength(3);
      expect(validPriorities).toContain('low');
      expect(validPriorities).toContain('medium');
      expect(validPriorities).toContain('high');
    });
  });
});