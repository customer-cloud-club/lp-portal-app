import crypto from 'crypto';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  B2Config,
  B2AuthResponse,
  B2UploadUrlResponse,
  B2UploadResponse,
  B2DownloadResponse,
  B2ListFilesResponse,
  UploadOptions,
  DownloadOptions,
  ArchiveOptions
} from '../types/b2.types.js';

/**
 * B2 Cloud Storage service for upload/download and archive management
 */
export class B2Service {
  private readonly config: B2Config;
  private authInfo: B2AuthResponse | null = null;
  private uploadUrl: B2UploadUrlResponse | null = null;
  private axiosInstance: AxiosInstance;

  constructor(config: B2Config) {
    this.config = config;
    this.axiosInstance = axios.create({
      timeout: 30000,
    });
  }

  /**
   * Authenticate with B2 API
   */
  private async authenticate(): Promise<B2AuthResponse> {
    if (this.authInfo) {
      return this.authInfo;
    }

    try {
      const credentials = Buffer.from(
        `${this.config.applicationKeyId}:${this.config.applicationKey}`
      ).toString('base64');

      const response: AxiosResponse<B2AuthResponse> = await this.axiosInstance.post(
        'https://api.backblazeb2.com/b2api/v2/b2_authorize_account',
        {},
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      this.authInfo = response.data;
      return this.authInfo;
    } catch (error) {
      throw new Error(`B2 authentication failed: ${error}`);
    }
  }

  /**
   * Get upload URL for bucket
   */
  private async getUploadUrl(): Promise<B2UploadUrlResponse> {
    if (this.uploadUrl) {
      return this.uploadUrl;
    }

    const authInfo = await this.authenticate();

    try {
      const response: AxiosResponse<B2UploadUrlResponse> = await this.axiosInstance.post(
        `${authInfo.apiUrl}/b2api/v2/b2_get_upload_url`,
        {
          bucketId: this.config.bucketId,
        },
        {
          headers: {
            Authorization: authInfo.authorizationToken,
          },
        }
      );

      this.uploadUrl = response.data;
      return this.uploadUrl;
    } catch (error) {
      throw new Error(`Failed to get upload URL: ${error}`);
    }
  }

  /**
   * Calculate SHA1 hash of buffer
   */
  private calculateSha1(data: Buffer): string {
    return crypto.createHash('sha1').update(data).digest('hex');
  }

  /**
   * Upload file to B2
   */
  async uploadFile(
    fileName: string,
    data: Buffer,
    options: UploadOptions = {}
  ): Promise<B2UploadResponse> {
    const uploadUrlInfo = await this.getUploadUrl();
    const sha1Hash = this.calculateSha1(data);

    try {
      const response: AxiosResponse<B2UploadResponse> = await this.axiosInstance.post(
        uploadUrlInfo.uploadUrl,
        data,
        {
          headers: {
            Authorization: uploadUrlInfo.authorizationToken,
            'X-Bz-File-Name': encodeURIComponent(fileName),
            'Content-Type': options.contentType || 'application/octet-stream',
            'Content-Length': data.length.toString(),
            'X-Bz-Content-Sha1': sha1Hash,
            ...(options.fileInfo && {
              'X-Bz-Info-Custom-Metadata': JSON.stringify(options.fileInfo),
            }),
          },
          onUploadProgress: (progressEvent) => {
            if (options.onProgress && progressEvent.total) {
              const progress = (progressEvent.loaded / progressEvent.total) * 100;
              options.onProgress(progress);
            }
          },
        }
      );

      return response.data;
    } catch (error) {
      // Reset upload URL on error (it might be expired)
      this.uploadUrl = null;
      throw new Error(`File upload failed: ${error}`);
    }
  }

  /**
   * Download file from B2
   */
  async downloadFile(
    fileName: string,
    options: DownloadOptions = {}
  ): Promise<B2DownloadResponse> {
    const authInfo = await this.authenticate();

    try {
      const response: AxiosResponse<Buffer> = await this.axiosInstance.get(
        `${authInfo.downloadUrl}/file/${this.config.bucketName}/${encodeURIComponent(fileName)}`,
        {
          headers: {
            Authorization: authInfo.authorizationToken,
          },
          responseType: 'arraybuffer',
          onDownloadProgress: (progressEvent) => {
            if (options.onProgress && progressEvent.total) {
              const progress = (progressEvent.loaded / progressEvent.total) * 100;
              options.onProgress(progress);
            }
          },
        }
      );

      return {
        data: Buffer.from(response.data),
        contentType: response.headers['content-type'] || 'application/octet-stream',
        contentLength: parseInt(response.headers['content-length'] || '0', 10),
        fileName,
      };
    } catch (error) {
      throw new Error(`File download failed: ${error}`);
    }
  }

  /**
   * Download file by file ID
   */
  async downloadFileById(
    fileId: string,
    options: DownloadOptions = {}
  ): Promise<B2DownloadResponse> {
    const authInfo = await this.authenticate();

    try {
      const response: AxiosResponse<Buffer> = await this.axiosInstance.get(
        `${authInfo.downloadUrl}/b2api/v2/b2_download_file_by_id?fileId=${fileId}`,
        {
          headers: {
            Authorization: authInfo.authorizationToken,
          },
          responseType: 'arraybuffer',
          onDownloadProgress: (progressEvent) => {
            if (options.onProgress && progressEvent.total) {
              const progress = (progressEvent.loaded / progressEvent.total) * 100;
              options.onProgress(progress);
            }
          },
        }
      );

      return {
        data: Buffer.from(response.data),
        contentType: response.headers['content-type'] || 'application/octet-stream',
        contentLength: parseInt(response.headers['content-length'] || '0', 10),
        fileName: response.headers['x-bz-file-name'] || 'unknown',
      };
    } catch (error) {
      throw new Error(`File download by ID failed: ${error}`);
    }
  }

  /**
   * List files in bucket
   */
  async listFiles(
    startFileName?: string,
    maxFileCount: number = 100
  ): Promise<B2ListFilesResponse> {
    const authInfo = await this.authenticate();

    try {
      const response: AxiosResponse<B2ListFilesResponse> = await this.axiosInstance.post(
        `${authInfo.apiUrl}/b2api/v2/b2_list_file_names`,
        {
          bucketId: this.config.bucketId,
          startFileName,
          maxFileCount,
        },
        {
          headers: {
            Authorization: authInfo.authorizationToken,
          },
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to list files: ${error}`);
    }
  }

  /**
   * Delete file from B2
   */
  async deleteFile(fileName: string, fileId: string): Promise<void> {
    const authInfo = await this.authenticate();

    try {
      await this.axiosInstance.post(
        `${authInfo.apiUrl}/b2api/v2/b2_delete_file_version`,
        {
          fileName,
          fileId,
        },
        {
          headers: {
            Authorization: authInfo.authorizationToken,
          },
        }
      );
    } catch (error) {
      throw new Error(`File deletion failed: ${error}`);
    }
  }

  /**
   * Upload multiple files in parallel
   */
  async uploadFiles(
    files: Array<{ fileName: string; data: Buffer; options?: UploadOptions }>,
    concurrency: number = 3
  ): Promise<B2UploadResponse[]> {
    const results: B2UploadResponse[] = [];
    const chunks: typeof files[] = [];

    // Split files into chunks for parallel processing
    for (let i = 0; i < files.length; i += concurrency) {
      chunks.push(files.slice(i, i + concurrency));
    }

    // Process chunks sequentially, files within chunks in parallel
    for (const chunk of chunks) {
      const chunkPromises = chunk.map((file) =>
        this.uploadFile(file.fileName, file.data, file.options)
      );
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Create and upload archive
   */
  async createArchive(
    archiveName: string,
    files: Array<{ fileName: string; data: Buffer }>,
    options: ArchiveOptions = {}
  ): Promise<B2UploadResponse> {
    // Simple archive format: concatenated files with metadata
    const archiveData = this.createSimpleArchive(files, options);

    return this.uploadFile(archiveName, archiveData, {
      contentType: 'application/x-archive',
      fileInfo: {
        archive: 'true',
        fileCount: files.length.toString(),
        ...(options.includeMetadata && { metadata: 'included' }),
      },
    });
  }

  /**
   * Create simple archive format
   */
  private createSimpleArchive(
    files: Array<{ fileName: string; data: Buffer }>,
    options: ArchiveOptions
  ): Buffer {
    const parts: Buffer[] = [];

    // Add file count header
    const header = Buffer.from(JSON.stringify({ fileCount: files.length }));
    parts.push(Buffer.from([header.length]), header);

    // Add each file
    for (const file of files) {
      const fileNameBuffer = Buffer.from(file.fileName, 'utf8');
      const fileMetadata = Buffer.from(
        JSON.stringify({
          fileName: file.fileName,
          size: file.data.length,
          ...(options.includeMetadata && {
            sha1: this.calculateSha1(file.data),
          }),
        })
      );

      // Add metadata length, metadata, and file data
      parts.push(
        Buffer.from([fileMetadata.length]),
        fileMetadata,
        file.data
      );
    }

    return Buffer.concat(parts);
  }

  /**
   * Extract files from archive
   */
  async extractArchive(archiveData: Buffer): Promise<Array<{ fileName: string; data: Buffer }>> {
    const files: Array<{ fileName: string; data: Buffer }> = [];
    let offset = 0;

    // Read header
    const headerLength = archiveData.readUInt8(offset);
    offset += 1;
    const headerData = archiveData.subarray(offset, offset + headerLength);
    const header = JSON.parse(headerData.toString());
    offset += headerLength;

    // Read each file
    for (let i = 0; i < header.fileCount; i++) {
      const metadataLength = archiveData.readUInt8(offset);
      offset += 1;
      const metadataData = archiveData.subarray(offset, offset + metadataLength);
      const metadata = JSON.parse(metadataData.toString());
      offset += metadataLength;

      const fileData = archiveData.subarray(offset, offset + metadata.size);
      offset += metadata.size;

      files.push({
        fileName: metadata.fileName,
        data: fileData,
      });
    }

    return files;
  }

  /**
   * Clear cached authentication and upload URL
   */
  clearCache(): void {
    this.authInfo = null;
    this.uploadUrl = null;
  }
}