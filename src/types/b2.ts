/**
 * B2 Cloud Storage related types
 */
export interface B2Config {
  /** B2 application key ID */
  applicationKeyId: string;
  /** B2 application key */
  applicationKey: string;
  /** B2 bucket ID */
  bucketId: string;
  /** B2 bucket name */
  bucketName: string;
  /** API URL (optional, defaults to B2 API) */
  apiUrl?: string;
}

export interface B2AuthResponse {
  /** Account ID */
  accountId: string;
  /** Authorization token */
  authorizationToken: string;
  /** API URL for subsequent requests */
  apiUrl: string;
  /** Download URL */
  downloadUrl: string;
}

export interface B2UploadUrlResponse {
  /** Bucket ID */
  bucketId: string;
  /** Upload URL */
  uploadUrl: string;
  /** Authorization token for upload */
  authorizationToken: string;
}

export interface B2FileInfo {
  /** File ID */
  fileId: string;
  /** File name */
  fileName: string;
  /** Content type */
  contentType: string;
  /** Content length in bytes */
  contentLength: number;
  /** SHA1 hash */
  contentSha1: string;
  /** Upload timestamp */
  uploadTimestamp: number;
}

export interface B2ListFilesResponse {
  /** Array of files */
  files: B2FileInfo[];
  /** Next file name for pagination */
  nextFileName?: string;
  /** Next file ID for pagination */
  nextFileId?: string;
}

export interface UploadOptions {
  /** Content type (optional, will be inferred if not provided) */
  contentType?: string;
  /** Custom metadata */
  metadata?: Record<string, string>;
  /** Progress callback */
  onProgress?: (progress: number) => void;
}

export interface DownloadOptions {
  /** Range header for partial downloads */
  range?: string;
  /** Progress callback */
  onProgress?: (progress: number) => void;
}

export interface ArchiveOptions {
  /** Compression format */
  format: 'zip' | 'tar' | 'tar.gz';
  /** Archive name */
  archiveName: string;
  /** Files to include in archive */
  files: string[];
}
