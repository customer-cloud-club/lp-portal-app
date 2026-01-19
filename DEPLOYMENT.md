# Deployment Guide

## Overview

This document provides instructions for deploying the application to various environments including development, staging, and production.

## Prerequisites

### System Requirements

- Node.js 18.x or higher
- npm 8.x or higher
- Docker 20.x or higher (for containerized deployments)
- Git

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Application
NODE_ENV=production
PORT=3000
API_BASE_URL=https://api.example.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h

# External Services
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info
```

## Local Development

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/your-project.git
cd your-project

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Development Scripts

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check

# Build for production
npm run build
```

## Docker Deployment

### Building the Image

```bash
# Build the Docker image
docker build -t your-app:latest .

# Run the container
docker run -d \
  --name your-app \
  -p 3000:3000 \
  --env-file .env \
  your-app:latest
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=yourdb
      - POSTGRES_USER=youruser
      - POSTGRES_PASSWORD=yourpassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Production Deployment

### AWS Deployment

#### Using AWS ECS

1. **Create ECR Repository**
```bash
# Create ECR repository
aws ecr create-repository --repository-name your-app

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push image
docker tag your-app:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/your-app:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/your-app:latest
```

2. **Create ECS Task Definition**
```json
{
  "family": "your-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "your-app",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/your-app:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/your-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Using AWS Lambda

```bash
# Install Serverless Framework
npm install -g serverless

# Deploy to AWS Lambda
serverless deploy --stage production
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel --prod
```

### Heroku Deployment

```bash
# Install Heroku CLI and login
heroku login

# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=your-database-url

# Deploy
git push heroku main
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test
      - run: npm run lint
      - run: npm run type-check

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Deploy to production
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
        run: |
          # Your deployment script here
          ./scripts/deploy.sh
```

## Health Checks

### Application Health Check

```typescript
// src/health.ts
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version
  });
});
```

### Database Health Check

```bash
# Add to your health check endpoint
curl -f http://localhost:3000/health || exit 1
```

## Monitoring and Logging

### Application Metrics

- Response time monitoring
- Error rate tracking
- Memory and CPU usage
- Database connection pool status

### Log Aggregation

```typescript
// Configure structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## Rollback Strategy

### Blue-Green Deployment

1. Deploy new version to green environment
2. Run smoke tests on green environment
3. Switch traffic from blue to green
4. Keep blue environment for quick rollback

### Database Migrations

```bash
# Rollback last migration
npm run db:migrate:down

# Rollback to specific migration
npm run db:migrate:down -- --to 20230101000000
```

## Security Considerations

- Use HTTPS in production
- Implement rate limiting
- Validate all inputs
- Use environment variables for secrets
- Regular security updates
- Container image scanning
- Network security groups

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. **Database connection issues**
   - Check connection string
   - Verify database is running
   - Check network connectivity

3. **Memory issues**
   - Monitor heap usage
   - Check for memory leaks
   - Increase container memory limits

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm start

# Node.js inspector
node --inspect server.js
```
