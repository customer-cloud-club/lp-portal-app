import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler, { isValidUserId } from '../../../pages/api/users/[id]';
import { users } from '../../../pages/api/users/index';

// Clear users array before each test
beforeEach(() => {
  users.length = 0;
});

// Helper function to add test user
function addTestUser(id: string = 'test-user-1') {
  const user = {
    id,
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date('2023-01-01')
  };
  users.push(user);
  return user;
}

describe('/api/users/[id]', () => {
  describe('isValidUserId', () => {
    test('should validate correct user IDs', () => {
      expect(isValidUserId('valid-id')).toBe(true);
      expect(isValidUserId('user_123')).toBe(true);
      expect(isValidUserId('a')).toBe(true);
    });

    test('should reject invalid user IDs', () => {
      expect(isValidUserId('')).toBe(false);
    });
  });

  describe('GET /api/users/[id]', () => {
    test('should return user when found', async () => {
      const testUser = addTestUser('user-123');
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'user-123' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual(expect.objectContaining({
        id: testUser.id,
        name: testUser.name,
        email: testUser.email
      }));
      expect(data.message).toBe('User retrieved successfully');
    });

    test('should return 404 when user not found', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'non-existent-user' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    test('should return 400 for invalid user ID', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: '' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid user ID');
    });

    test('should handle missing ID parameter', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {}
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('User ID is required');
    });
  });

  describe('PUT /api/users/[id]', () => {
    test('should update user name successfully', async () => {
      addTestUser('user-123');
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'user-123' },
        body: { name: 'Updated Name' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Name');
      expect(data.data.email).toBe('test@example.com'); // Should remain unchanged
      expect(data.message).toBe('User updated successfully');
    });

    test('should update user email successfully', async () => {
      addTestUser('user-123');
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'user-123' },
        body: { email: 'newemail@example.com' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.email).toBe('newemail@example.com');
      expect(data.data.name).toBe('Test User'); // Should remain unchanged
    });

    test('should update both name and email', async () => {
      addTestUser('user-123');
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'user-123' },
        body: {
          name: 'New Name',
          email: 'newemail@example.com'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New Name');
      expect(data.data.email).toBe('newemail@example.com');
    });

    test('should trim and normalize input', async () => {
      addTestUser('user-123');
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'user-123' },
        body: {
          name: '  New Name  ',
          email: '  NEWEMAIL@EXAMPLE.COM  '
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.name).toBe('New Name');
      expect(data.data.email).toBe('newemail@example.com');
    });

    test('should return 404 when user not found', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'non-existent-user' },
        body: { name: 'New Name' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    test('should reject invalid name', async () => {
      addTestUser('user-123');
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'user-123' },
        body: { name: '' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Name must be a non-empty string');
    });

    test('should reject invalid email', async () => {
      addTestUser('user-123');
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'user-123' },
        body: { email: 'invalid-email' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Valid email is required');
    });

    test('should reject duplicate email', async () => {
      addTestUser('user-123');
      users.push({
        id: 'user-456',
        name: 'Another User',
        email: 'another@example.com',
        createdAt: new Date()
      });
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'user-123' },
        body: { email: 'another@example.com' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Email already exists');
    });

    test('should allow updating to same email', async () => {
      addTestUser('user-123');
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
        query: { id: 'user-123' },
        body: { email: 'test@example.com' } // Same as existing email
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
    });
  });

  describe('DELETE /api/users/[id]', () => {
    test('should delete user successfully', async () => {
      addTestUser('user-123');
      expect(users).toHaveLength(1);
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: 'user-123' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.message).toBe('User deleted successfully');
      expect(users).toHaveLength(0);
    });

    test('should return 404 when user not found', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: 'non-existent-user' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });
  });

  describe('Unsupported methods', () => {
    test('should return 405 for unsupported methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: 'user-123' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method PATCH not allowed');
    });

    test('should handle OPTIONS method', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'OPTIONS',
        query: { id: 'user-123' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });
  });
});