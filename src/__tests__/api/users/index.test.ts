import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler, { validateCreateUserInput, isValidEmail, users } from '../../../pages/api/users/index';

// Clear users array before each test
beforeEach(() => {
  users.length = 0;
});

describe('/api/users', () => {
  describe('validateCreateUserInput', () => {
    test('should validate correct input', () => {
      const input = { name: 'John Doe', email: 'john@example.com' };
      const result = validateCreateUserInput(input);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject empty body', () => {
      const result = validateCreateUserInput(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Request body is required');
    });

    test('should reject missing name', () => {
      const input = { email: 'john@example.com' };
      const result = validateCreateUserInput(input);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name is required and must be a non-empty string');
    });

    test('should reject empty name', () => {
      const input = { name: '', email: 'john@example.com' };
      const result = validateCreateUserInput(input);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name is required and must be a non-empty string');
    });

    test('should reject invalid email', () => {
      const input = { name: 'John Doe', email: 'invalid-email' };
      const result = validateCreateUserInput(input);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Valid email is required');
    });

    test('should reject duplicate email', () => {
      users.push({
        id: 'test-id',
        name: 'Existing User',
        email: 'john@example.com',
        createdAt: new Date()
      });
      
      const input = { name: 'John Doe', email: 'john@example.com' };
      const result = validateCreateUserInput(input);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email already exists');
    });
  });

  describe('isValidEmail', () => {
    test('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    test('should reject invalid email formats', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('invalid@.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('GET /api/users', () => {
    test('should return empty array when no users exist', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(data.message).toBe('Retrieved 0 users');
    });

    test('should return all users when they exist', async () => {
      // Add test users
      users.push(
        {
          id: 'user1',
          name: 'User One',
          email: 'user1@example.com',
          createdAt: new Date('2023-01-01')
        },
        {
          id: 'user2',
          name: 'User Two',
          email: 'user2@example.com',
          createdAt: new Date('2023-01-02')
        }
      );

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.message).toBe('Retrieved 2 users');
    });
  });

  describe('POST /api/users', () => {
    test('should create a new user successfully', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('John Doe');
      expect(data.data.email).toBe('john@example.com');
      expect(data.data.id).toBeDefined();
      expect(data.data.createdAt).toBeDefined();
      expect(data.message).toBe('User created successfully');
      expect(users).toHaveLength(1);
    });

    test('should trim whitespace from name and email', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          name: '  John Doe  ',
          email: '  JOHN@EXAMPLE.COM  '
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.data.name).toBe('John Doe');
      expect(data.data.email).toBe('john@example.com');
    });

    test('should reject invalid input', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          name: '',
          email: 'invalid-email'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    test('should reject duplicate email', async () => {
      // Create first user
      users.push({
        id: 'existing-user',
        name: 'Existing User',
        email: 'john@example.com',
        createdAt: new Date()
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Email already exists');
    });
  });

  describe('Unsupported methods', () => {
    test('should return 405 for unsupported methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method DELETE not allowed');
    });

    test('should handle OPTIONS method', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'OPTIONS',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });
  });
});