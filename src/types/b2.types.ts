/**
 * B2 Cloud Storage types and interfaces
 */

export interface B2Config {
  applicationKeyId: string;
  applicationKey: string;
  bucketId: string;
  bucketName: string;
}

export interface B2AuthResponse {
  accountId: string;
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
}

export interface B2UploadUrlResponse {
  bucketId: string;
  uploadUrl: string;
  authorizationToken: string;
}

export interface B2FileInfo {
  fileId: string;
  fileName: string;
  contentType: string;
  contentLength: number;
  contentSha1: string;
  fileInfo: Record<string, string>;
}

export interface B2UploadResponse extends B2FileInfo {
  bucketId: string;
  uploadTimestamp: number;
}

export interface B2DownloadResponse {
  data: Buffer;
  contentType: string;
  contentLength: number;
  fileName: string;
}

export interface B2ListFilesResponse {
  files: B2FileInfo[];
  nextFileName?: string;
}

export interface UploadOptions {
  contentType?: string;
  fileInfo?: Record<string, string>;
  onProgress?: (progress: number) => void;
}

export interface DownloadOptions {
  onProgress?: (progress: number) => void;
}

export interface ArchiveOptions {
  compressionLevel?: number;
  includeMetadata?: boolean;
}