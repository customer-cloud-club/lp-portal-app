/**
 * Streaming server implementation
 * Provides HTTP server with streaming capabilities
 */

import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { createServer as createHttpsServer, Server as HttpsServer } from 'https';
import { readFileSync } from 'fs';
import { StreamingConfig, StreamingServerOptions } from '../config/streaming';

export type StreamingServerType = Server | HttpsServer;

export interface StreamingConnectionInfo {
  id: string;
  remoteAddress: string;
  connectedAt: Date;
  isActive: boolean;
}

export class StreamingServer {
  private server: StreamingServerType | null = null;
  private connections = new Map<string, StreamingConnectionInfo>();
  private connectionCounter = 0;
  private isRunning = false;

  constructor(private options: StreamingServerOptions) {
    this.validateOptions();
  }

  /**
   * Validates server options
   * @throws Error if options are invalid
   */
  private validateOptions(): void {
    if (!this.options.config) {
      throw new Error('Configuration is required');
    }
  }

  /**
   * Starts the streaming server
   * @returns Promise that resolves when server is listening
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    try {
      await this.createServer();
      await this.listen();
      this.isRunning = true;
      this.log('info', `Streaming server started on ${this.options.config.host}:${this.options.config.port}`);
    } catch (error) {
      this.log('error', 'Failed to start streaming server', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  /**
   * Stops the streaming server
   * @returns Promise that resolves when server is closed
   */
  public async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          this.log('error', 'Error stopping server', error);
          reject(error);
        } else {
          this.isRunning = false;
          this.connections.clear();
          this.log('info', 'Streaming server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Creates HTTP or HTTPS server based on configuration
   */
  private async createServer(): Promise<void> {
    const requestHandler = this.handleRequest.bind(this);

    if (this.options.config.ssl) {
      const httpsOptions = {
        cert: readFileSync(this.options.config.sslCertPath!),
        key: readFileSync(this.options.config.sslKeyPath!)
      };
      this.server = createHttpsServer(httpsOptions, requestHandler);
    } else {
      this.server = createServer(requestHandler);
    }

    this.setupServerEvents();
  }

  /**
   * Sets up server event handlers
   */
  private setupServerEvents(): void {
    if (!this.server) return;

    this.server.on('connection', (socket) => {
      const connectionId = this.generateConnectionId();
      const connectionInfo: StreamingConnectionInfo = {
        id: connectionId,
        remoteAddress: socket.remoteAddress || 'unknown',
        connectedAt: new Date(),
        isActive: true
      };

      this.connections.set(connectionId, connectionInfo);

      // Check max connections
      if (this.connections.size > this.options.config.maxConnections) {
        this.log('warn', `Max connections exceeded: ${this.connections.size}`);
        socket.destroy();
        this.connections.delete(connectionId);
        return;
      }

      socket.setTimeout(this.options.config.timeout);
      
      socket.on('close', () => {
        const connection = this.connections.get(connectionId);
        if (connection) {
          connection.isActive = false;
          this.connections.delete(connectionId);
        }
      });

      socket.on('timeout', () => {
        this.log('warn', `Connection timeout for ${connectionId}`);
        socket.destroy();
      });

      socket.on('error', (error) => {
        this.log('error', `Socket error for ${connectionId}`, error);
      });
    });

    this.server.on('error', (error) => {
      this.log('error', 'Server error', error);
    });
  }

  /**
   * Handles incoming HTTP requests
   */
  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    try {
      // Set CORS headers if enabled
      if (this.options.config.cors.enabled) {
        this.setCorsHeaders(res);
      }

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Basic request logging
      this.log('info', `${req.method} ${req.url} from ${req.socket.remoteAddress}`);

      // Set streaming headers
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Handle streaming endpoint
      if (req.url === '/stream') {
        this.handleStreamRequest(req, res);
      } else if (req.url === '/health') {
        this.handleHealthCheck(req, res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    } catch (error) {
      this.log('error', 'Request handling error', error instanceof Error ? error : new Error('Unknown error'));
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }

  /**
   * Handles streaming requests
   */
  private handleStreamRequest(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Send initial connection message
    res.write(`data: Connected to streaming server\n\n`);

    // Keep connection alive with periodic pings
    const pingInterval = setInterval(() => {
      if (!res.destroyed) {
        res.write(`data: ping ${Date.now()}\n\n`);
      } else {
        clearInterval(pingInterval);
      }
    }, 10000);

    req.on('close', () => {
      clearInterval(pingInterval);
    });
  }

  /**
   * Handles health check requests
   */
  private handleHealthCheck(req: IncomingMessage, res: ServerResponse): void {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connections: this.connections.size,
      uptime: process.uptime()
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthStatus));
  }

  /**
   * Sets CORS headers on response
   */
  private setCorsHeaders(res: ServerResponse): void {
    const { cors } = this.options.config;
    res.setHeader('Access-Control-Allow-Origin', cors.origins.join(', '));
    res.setHeader('Access-Control-Allow-Methods', cors.methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  /**
   * Starts listening on configured port and host
   */
  private async listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        reject(new Error('Server not created'));
        return;
      }

      this.server.listen(this.options.config.port, this.options.config.host, () => {
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  /**
   * Generates unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${++this.connectionCounter}_${Date.now()}`;
  }

  /**
   * Logs messages using provided logger or console
   */
  private log(level: 'info' | 'error' | 'warn', message: string, error?: Error): void {
    if (this.options.logger) {
      this.options.logger[level](message, error);
    } else {
      console[level](`[StreamingServer] ${message}`, error || '');
    }
  }

  /**
   * Gets current server status
   */
  public getStatus(): {
    isRunning: boolean;
    connections: number;
    config: StreamingConfig;
  } {
    return {
      isRunning: this.isRunning,
      connections: this.connections.size,
      config: this.options.config
    };
  }

  /**
   * Gets list of active connections
   */
  public getConnections(): StreamingConnectionInfo[] {
    return Array.from(this.connections.values());
  }
}
