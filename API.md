# API Documentation

## Overview

This document provides comprehensive information about the API endpoints, request/response formats, and authentication methods.

## Base URL

```
https://api.example.com/v1
```

## Authentication

### API Key Authentication

Include your API key in the request header:

```http
Authorization: Bearer YOUR_API_KEY
```

### OAuth 2.0

For OAuth 2.0 authentication, follow the standard OAuth flow:

1. Redirect user to authorization endpoint
2. Exchange authorization code for access token
3. Use access token in API requests

## Endpoints

### Users

#### GET /users

Retrieve a list of users.

**Parameters:**
- `limit` (optional): Number of users to return (default: 10, max: 100)
- `offset` (optional): Number of users to skip (default: 0)
- `sort` (optional): Sort field (name, email, created_at)

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "created_at": "string (ISO 8601)",
      "updated_at": "string (ISO 8601)"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0
  }
}
```

#### POST /users

Create a new user.

**Request Body:**
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "password": "string (required, min 8 characters)"
}
```

**Response:**
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "created_at": "string (ISO 8601)"
}
```

#### GET /users/{id}

Retrieve a specific user by ID.

**Parameters:**
- `id` (required): User ID

**Response:**
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)"
}
```

#### PUT /users/{id}

Update a specific user.

**Parameters:**
- `id` (required): User ID

**Request Body:**
```json
{
  "name": "string (optional)",
  "email": "string (optional)"
}
```

#### DELETE /users/{id}

Delete a specific user.

**Parameters:**
- `id` (required): User ID

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

## Error Handling

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "object (optional)"
  }
}
```

### Error Codes

- `400` - Bad Request: Invalid request format or parameters
- `401` - Unauthorized: Invalid or missing authentication
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Resource not found
- `409` - Conflict: Resource already exists
- `422` - Unprocessable Entity: Validation errors
- `429` - Too Many Requests: Rate limit exceeded
- `500` - Internal Server Error: Server error

## Rate Limiting

API requests are rate limited to:
- 1000 requests per hour for authenticated users
- 100 requests per hour for unauthenticated users

Rate limit information is included in response headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## SDKs and Libraries

### TypeScript/JavaScript

```bash
npm install @example/api-client
```

```typescript
import { ApiClient } from '@example/api-client';

const client = new ApiClient({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'https://api.example.com/v1'
});

const users = await client.users.list({ limit: 20 });
```

## Webhooks

Webhooks allow you to receive real-time notifications when certain events occur.

### Supported Events

- `user.created`
- `user.updated`
- `user.deleted`

### Webhook Payload

```json
{
  "event": "user.created",
  "timestamp": "2023-01-01T00:00:00Z",
  "data": {
    "id": "string",
    "name": "string",
    "email": "string"
  }
}
```

### Security

Webhook payloads are signed with HMAC-SHA256. Verify the signature using the `X-Signature` header.
