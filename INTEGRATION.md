# Integration Guide

## Overview

This document provides comprehensive guidance for integrating with our system, including API integration, webhook setup, SDK usage, and third-party service integrations.

## API Integration

### Getting Started

1. **Obtain API Credentials**
   - Sign up for an account at [Developer Portal](https://developer.example.com)
   - Generate API key from the dashboard
   - Note your API key and base URL

2. **Authentication Setup**
   ```typescript
   // API Key Authentication
   const headers = {
     'Authorization': 'Bearer YOUR_API_KEY',
     'Content-Type': 'application/json'
   };
   
   // OAuth 2.0 Authentication
   const token = await getOAuthToken();
   const headers = {
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
   };
   ```

### SDK Integration

#### TypeScript/JavaScript SDK

**Installation:**
```bash
npm install @example/api-client
```

**Basic Usage:**
```typescript
import { ApiClient } from '@example/api-client';

// Initialize client
const client = new ApiClient({
  apiKey: process.env.API_KEY,
  baseUrl: 'https://api.example.com/v1',
  timeout: 30000
});

// Use the client
async function createUser() {
  try {
    const user = await client.users.create({
      name: 'John Doe',
      email: 'john@example.com'
    });
    console.log('User created:', user);
  } catch (error) {
    console.error('Error creating user:', error);
  }
}
```

**Advanced Configuration:**
```typescript
interface ApiClientConfig {
  apiKey: string;
  baseUrl: string;
  timeout?: number;
  retryConfig?: {
    retries: number;
    backoff: 'linear' | 'exponential';
    maxDelay: number;
  };
  rateLimiting?: {
    maxRequests: number;
    perMilliseconds: number;
  };
}

const client = new ApiClient({
  apiKey: process.env.API_KEY!,
  baseUrl: 'https://api.example.com/v1',
  timeout: 30000,
  retryConfig: {
    retries: 3,
    backoff: 'exponential',
    maxDelay: 5000
  },
  rateLimiting: {
    maxRequests: 100,
    perMilliseconds: 60000
  }
});
```

#### React Integration

```typescript
// hooks/useApi.ts
import { useState, useEffect } from 'react';
import { ApiClient } from '@example/api-client';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useApi<T>(
  request: (client: ApiClient) => Promise<T>,
  dependencies: any[] = []
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await request(client);
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
}

// Component usage
function UsersList() {
  const { data: users, loading, error, refetch } = useApi(
    (client) => client.users.list({ limit: 20 })
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      <ul>
        {users?.data.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

#### Node.js Backend Integration

```typescript
// services/UserService.ts
import { ApiClient } from '@example/api-client';
import { Logger } from '../utils/logger';

export class UserService {
  private client: ApiClient;
  private logger: Logger;

  constructor() {
    this.client = new ApiClient({
      apiKey: process.env.API_KEY!,
      baseUrl: process.env.API_BASE_URL!
    });
    this.logger = new Logger('UserService');
  }

  async syncUsers(): Promise<void> {
    try {
      const users = await this.client.users.list({ limit: 100 });
      
      for (const user of users.data) {
        await this.processUser(user);
      }
      
      this.logger.info(`Synced ${users.data.length} users`);
    } catch (error) {
      this.logger.error('Failed to sync users:', error);
      throw error;
    }
  }

  private async processUser(user: any): Promise<void> {
    // Your user processing logic
  }
}
```

## Webhook Integration

### Setting Up Webhooks

1. **Configure Webhook URL**
   ```bash
   curl -X POST https://api.example.com/v1/webhooks \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://your-app.com/webhooks",
       "events": ["user.created", "user.updated", "user.deleted"],
       "secret": "your-webhook-secret"
     }'
   ```

2. **Webhook Handler Implementation**
   ```typescript
   // webhooks/handler.ts
   import crypto from 'crypto';
   import express from 'express';

   const app = express();

   // Webhook signature verification
   function verifyWebhookSignature(
     payload: string,
     signature: string,
     secret: string
   ): boolean {
     const expectedSignature = crypto
       .createHmac('sha256', secret)
       .update(payload)
       .digest('hex');
     
     return crypto.timingSafeEqual(
       Buffer.from(signature, 'hex'),
       Buffer.from(expectedSignature, 'hex')
     );
   }

   // Webhook endpoint
   app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
     const signature = req.headers['x-signature'] as string;
     const payload = req.body.toString();
     
     if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET!)) {
       return res.status(401).json({ error: 'Invalid signature' });
     }

     const event = JSON.parse(payload);
     
     // Process webhook event
     handleWebhookEvent(event)
       .then(() => res.status(200).json({ received: true }))
       .catch((error) => {
         console.error('Webhook processing failed:', error);
         res.status(500).json({ error: 'Processing failed' });
       });
   });

   async function handleWebhookEvent(event: any): Promise<void> {
     switch (event.type) {
       case 'user.created':
         await handleUserCreated(event.data);
         break;
       case 'user.updated':
         await handleUserUpdated(event.data);
         break;
       case 'user.deleted':
         await handleUserDeleted(event.data);
         break;
       default:
         console.log('Unknown event type:', event.type);
     }
   }
   ```

3. **Webhook Retry Logic**
   ```typescript
   // utils/webhookProcessor.ts
   import { Queue } from 'bull';

   const webhookQueue = new Queue('webhook processing');

   webhookQueue.process(async (job) => {
     const { event } = job.data;
     
     try {
       await processWebhookEvent(event);
     } catch (error) {
       // Retry with exponential backoff
       if (job.attemptsMade < 3) {
         throw error; // This will trigger a retry
       }
       
       // Log failed webhook for manual investigation
       console.error('Webhook failed after retries:', error);
     }
   });

   // Add webhook to processing queue
   export function queueWebhook(event: any): void {
     webhookQueue.add(event, {
       attempts: 3,
       backoff: {
         type: 'exponential',
         delay: 2000
       }
     });
   }
   ```

## Third-Party Integrations

### Database Integration

#### PostgreSQL
```typescript
// database/connection.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export { pool };

// models/User.ts
export class UserModel {
  static async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async create(userData: CreateUserData): Promise<User> {
    const query = `
      INSERT INTO users (name, email, created_at)
      VALUES ($1, $2, NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [userData.name, userData.email]);
    return result.rows[0];
  }
}
```

#### Redis Integration
```typescript
// cache/redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  static async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  static async delete(key: string): Promise<void> {
    await redis.del(key);
  }

  static async exists(key: string): Promise<boolean> {
    return (await redis.exists(key)) === 1;
  }
}
```

### Message Queue Integration

#### RabbitMQ
```typescript
// messaging/rabbitmq.ts
import amqp from 'amqplib';

class MessageQueue {
  private connection!: amqp.Connection;
  private channel!: amqp.Channel;

  async connect(): Promise<void> {
    this.connection = await amqp.connect(process.env.RABBITMQ_URL!);
    this.channel = await this.connection.createChannel();
  }

  async publishEvent(exchange: string, routingKey: string, data: any): Promise<void> {
    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    
    const message = Buffer.from(JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID()
    }));

    this.channel.publish(exchange, routingKey, message, {
      persistent: true,
      messageId: crypto.randomUUID()
    });
  }

  async consumeEvents(
    exchange: string,
    queue: string,
    routingKey: string,
    handler: (data: any) => Promise<void>
  ): Promise<void> {
    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.bindQueue(queue, exchange, routingKey);

    this.channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const data = JSON.parse(msg.content.toString());
          await handler(data);
          this.channel.ack(msg);
        } catch (error) {
          console.error('Message processing failed:', error);
          this.channel.nack(msg, false, false); // Dead letter queue
        }
      }
    });
  }
}

export const messageQueue = new MessageQueue();
```

### Email Integration

#### SendGrid
```typescript
// services/EmailService.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export class EmailService {
  static async sendEmail({
    to,
    subject,
    html,
    text
  }: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<void> {
    const msg = {
      to,
      from: process.env.FROM_EMAIL!,
      subject,
      text,
      html
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  static async sendTemplate({
    to,
    templateId,
    dynamicTemplateData
  }: {
    to: string;
    templateId: string;
    dynamicTemplateData: Record<string, any>;
  }): Promise<void> {
    const msg = {
      to,
      from: process.env.FROM_EMAIL!,
      templateId,
      dynamicTemplateData
    };

    await sgMail.send(msg);
  }
}
```

### Payment Integration

#### Stripe
```typescript
// services/PaymentService.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

export class PaymentService {
  static async createPaymentIntent({
    amount,
    currency = 'usd',
    customerId
  }: {
    amount: number;
    currency?: string;
    customerId?: string;
  }): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      automatic_payment_methods: {
        enabled: true
      }
    });
  }

  static async createCustomer({
    email,
    name
  }: {
    email: string;
    name: string;
  }): Promise<Stripe.Customer> {
    return await stripe.customers.create({
      email,
      name
    });
  }

  static async handleWebhook(
    payload: string,
    signature: string
  ): Promise<void> {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
    }
  }
}
```

## Error Handling and Retry Logic

```typescript
// utils/retryWrapper.ts
export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  backoff: 'linear' | 'exponential';
  shouldRetry?: (error: Error) => boolean;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;
  let delay = options.delay;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === options.maxAttempts || 
          (options.shouldRetry && !options.shouldRetry(lastError))) {
        throw lastError;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      
      if (options.backoff === 'exponential') {
        delay *= 2;
      } else {
        delay += options.delay;
      }
    }
  }

  throw lastError!;
}

// Usage example
const result = await withRetry(
  () => apiClient.users.create(userData),
  {
    maxAttempts: 3,
    delay: 1000,
    backoff: 'exponential',
    shouldRetry: (error) => error.message.includes('rate limit')
  }
);
```

## Testing Integration

```typescript
// tests/integration/api.test.ts
import { ApiClient } from '../src/ApiClient';
import nock from 'nock';

describe('API Integration', () => {
  let client: ApiClient;
  
  beforeEach(() => {
    client = new ApiClient({
      apiKey: 'test-key',
      baseUrl: 'https://api.test.com'
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should create user successfully', async () => {
    const userData = { name: 'John Doe', email: 'john@example.com' };
    const expectedResponse = { id: '123', ...userData };

    nock('https://api.test.com')
      .post('/users', userData)
      .reply(201, expectedResponse);

    const result = await client.users.create(userData);
    expect(result).toEqual(expectedResponse);
  });

  it('should handle API errors gracefully', async () => {
    nock('https://api.test.com')
      .post('/users')
      .reply(400, { error: 'Invalid data' });

    await expect(client.users.create({})).rejects.toThrow('Invalid data');
  });
});
```

## Best Practices

### Security
- Always use HTTPS for API calls
- Validate webhook signatures
- Store API keys securely (environment variables)
- Implement rate limiting
- Use proper authentication methods

### Performance
- Implement connection pooling
- Use caching where appropriate
- Handle rate limits gracefully
- Monitor API usage and performance

### Error Handling
- Implement comprehensive error handling
- Use retry logic with exponential backoff
- Log errors for debugging
- Provide meaningful error messages

### Monitoring
- Track API response times
- Monitor error rates
- Set up alerts for failures
- Use structured logging

## Support and Resources

- **Documentation**: [https://docs.example.com](https://docs.example.com)
- **API Reference**: [https://api-docs.example.com](https://api-docs.example.com)
- **Developer Portal**: [https://developer.example.com](https://developer.example.com)
- **Support**: [support@example.com](mailto:support@example.com)
- **Status Page**: [https://status.example.com](https://status.example.com)
