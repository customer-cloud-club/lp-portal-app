import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable, PassThrough } from 'stream';
import archiver from 'archiver';
import {
  B2Config,
  B2AuthResponse,
  B2UploadUrlResponse,
  B2FileInfo,
  B2ListFilesResponse,
  UploadOptions,
  DownloadOptions,
  ArchiveOptions
} from '../types/b2';

/**
 * B2 Cloud Storage service for upload/download and archive management
 * Supports parallel operations for improved performance
 */
export class B2Service {
  private config: B2Config;
  private authInfo: B2AuthResponse | null = null;
  private uploadUrls: Map<string, B2UploadUrlResponse> = new Map();
  private readonly maxConcurrency: number;

  /**
   * Initialize B2 service
   * @param config B2 configuration
   * @param maxConcurrency Maximum number of concurrent operations (default: 5)
   */
  constructor(config: B2Config, maxConcurrency: number = 5) {
    this.config = config;
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Authenticate with B2 API
   * @returns Promise resolving to auth response
   */
  async authenticate(): Promise<B2AuthResponse> {
    try {
      const credentials = Buffer.from(`${this.config.applicationKeyId}:${this.config.applicationKey}`).toString('base64');
      
      const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      this.authInfo = await response.json() as B2AuthResponse;
      return this.authInfo;
    } catch (error) {
      throw new Error(`B2 authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get upload URL for bucket
   * @returns Promise resolving to upload URL info
   */
  private async getUploadUrl(): Promise<B2UploadUrlResponse> {
    if (!this.authInfo) {
      await this.authenticate();
    }

    const cacheKey = this.config.bucketId;
    const cachedUrl = this.uploadUrls.get(cacheKey);
    if (cachedUrl) {
      return cachedUrl;
    }

    try {
      const response = await fetch(`${this.authInfo!.apiUrl}/b2api/v2/b2_get_upload_url`, {
        method: 'POST',
        headers: {
          'Authorization': this.authInfo!.authorizationToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bucketId: this.config.bucketId })
      });

      if (!response.ok) {
        throw new Error(`Failed to get upload URL: ${response.statusText}`);
      }

      const uploadUrlInfo = await response.json() as B2UploadUrlResponse;
      this.uploadUrls.set(cacheKey, uploadUrlInfo);
      return uploadUrlInfo;
    } catch (error) {
      throw new Error(`Failed to get upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload file to B2
   * @param fileName File name in B2
   * @param data File data as Buffer or Readable stream
   * @param options Upload options
   * @returns Promise resolving to file info
   */
  async uploadFile(fileName: string, data: Buffer | Readable, options: UploadOptions = {}): Promise<B2FileInfo> {
    try {
      const uploadUrl = await this.getUploadUrl();
      
      let contentLength: number;
      let contentSha1: string;
      let body: Buffer | Readable;

      if (Buffer.isBuffer(data)) {
        contentLength = data.length;
        contentSha1 = crypto.createHash('sha1').update(data).digest('hex');
        body = data;
      } else {
        // For streams, we need to read the data to calculate hash and length
        const chunks: Buffer[] = [];
        const hash = crypto.createHash('sha1');
        
        for await (const chunk of data) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          chunks.push(buffer);
          hash.update(buffer);
        }
        
        body = Buffer.concat(chunks);
        contentLength = body.length;
        contentSha1 = hash.digest('hex');
      }

      const headers: Record<string, string> = {
        'Authorization': uploadUrl.authorizationToken,
        'X-Bz-File-Name': encodeURIComponent(fileName),
        'Content-Type': options.contentType || 'application/octet-stream',
        'Content-Length': contentLength.toString(),
        'X-Bz-Content-Sha1': contentSha1
      };

      // Add custom metadata
      if (options.metadata) {
        Object.entries(options.metadata).forEach(([key, value]) => {
          headers[`X-Bz-Info-${key}`] = encodeURIComponent(value);
        });
      }

      const response = await fetch(uploadUrl.uploadUrl, {
        method: 'POST',
        headers,
        body
      });

      if (!response.ok) {
        // Clear cached upload URL on error
        this.uploadUrls.delete(this.config.bucketId);
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return await response.json() as B2FileInfo;
    } catch (error) {
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download file from B2
   * @param fileName File name in B2
   * @param options Download options
   * @returns Promise resolving to file data as Buffer
   */
  async downloadFile(fileName: string, options: DownloadOptions = {}): Promise<Buffer> {
    if (!this.authInfo) {
      await this.authenticate();
    }

    try {
      const headers: Record<string, string> = {
        'Authorization': this.authInfo!.authorizationToken
      };

      if (options.range) {
        headers['Range'] = options.range;
      }

      const response = await fetch(
        `${this.authInfo!.downloadUrl}/file/${this.config.bucketName}/${encodeURIComponent(fileName)}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const chunks: Uint8Array[] = [];
      const reader = response.body?.getReader();
      
      if (!reader) {
        throw new Error('No response body');
      }

      let receivedLength = 0;
      const contentLength = parseInt(response.headers.get('Content-Length') || '0');

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        if (options.onProgress && contentLength > 0) {
          options.onProgress((receivedLength / contentLength) * 100);
        }
      }

      return Buffer.concat(chunks);
    } catch (error) {
      throw new Error(`File download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List files in bucket
   * @param maxFileCount Maximum number of files to return (default: 100)
   * @param startFileName Start listing from this file name
   * @returns Promise resolving to file list
   */
  async listFiles(maxFileCount: number = 100, startFileName?: string): Promise<B2ListFilesResponse> {
    if (!this.authInfo) {
      await this.authenticate();
    }

    try {
      const body: any = {
        bucketId: this.config.bucketId,
        maxFileCount
      };

      if (startFileName) {
        body.startFileName = startFileName;
      }

      const response = await fetch(`${this.authInfo!.apiUrl}/b2api/v2/b2_list_file_names`, {
        method: 'POST',
        headers: {
          'Authorization': this.authInfo!.authorizationToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`List files failed: ${response.statusText}`);
      }

      return await response.json() as B2ListFilesResponse;
    } catch (error) {
      throw new Error(`List files failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete file from B2
   * @param fileName File name to delete
   * @param fileId File ID to delete
   * @returns Promise resolving when file is deleted
   */
  async deleteFile(fileName: string, fileId: string): Promise<void> {
    if (!this.authInfo) {
      await this.authenticate();
    }

    try {
      const response = await fetch(`${this.authInfo!.apiUrl}/b2api/v2/b2_delete_file_version`, {
        method: 'POST',
        headers: {
          'Authorization': this.authInfo!.authorizationToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName,
          fileId
        })
      });

      if (!response.ok) {
        throw new Error(`Delete file failed: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`File deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple files in parallel
   * @param files Array of file data with names
   * @param options Upload options
   * @returns Promise resolving to array of file info
   */
  async uploadFilesParallel(
    files: Array<{ fileName: string; data: Buffer | Readable; options?: UploadOptions }>
  ): Promise<B2FileInfo[]> {
    const semaphore = new Semaphore(this.maxConcurrency);
    
    const uploadPromises = files.map(async (file) => {
      await semaphore.acquire();
      try {
        return await this.uploadFile(file.fileName, file.data, file.options);
      } finally {
        semaphore.release();
      }
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Create and upload archive
   * @param options Archive options
   * @returns Promise resolving to uploaded archive info
   */
  async createAndUploadArchive(options: ArchiveOptions): Promise<B2FileInfo> {
    try {
      const archive = archiver(options.format === 'tar.gz' ? 'tar' : options.format, {
        gzip: options.format === 'tar.gz'
      });

      const archiveStream = new PassThrough();
      archive.pipe(archiveStream);

      // Download and add files to archive in parallel
      const downloadPromises = options.files.map(async (fileName) => {
        try {
          const fileData = await this.downloadFile(fileName);
          archive.append(fileData, { name: fileName });
        } catch (error) {
          console.warn(`Failed to add ${fileName} to archive: ${error}`);
        }
      });

      await Promise.all(downloadPromises);
      archive.finalize();

      // Upload archive
      return await this.uploadFile(options.archiveName, archiveStream, {
        contentType: this.getArchiveContentType(options.format)
      });
    } catch (error) {
      throw new Error(`Archive creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get content type for archive format
   * @param format Archive format
   * @returns Content type string
   */
  private getArchiveContentType(format: string): string {
    switch (format) {
      case 'zip': return 'application/zip';
      case 'tar': return 'application/x-tar';
      case 'tar.gz': return 'application/gzip';
      default: return 'application/octet-stream';
    }
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waiting.push(resolve);
      }
    });
  }

  release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      this.permits--;
      next!();
    }
  }
}
