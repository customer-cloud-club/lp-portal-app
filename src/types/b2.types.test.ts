import {
  B2Config,
  B2AuthResponse,
  B2UploadUrlResponse,
  B2FileInfo,
  B2UploadResponse,
  B2DownloadResponse,
  B2ListFilesResponse,
  UploadOptions,
  DownloadOptions,
  ArchiveOptions,
} from './b2.types.js';

describe('B2 Types', () => {
  describe('B2Config', () => {
    it('should define the correct structure', () => {
      const config: B2Config = {
        applicationKeyId: 'test-key-id',
        applicationKey: 'test-key',
        bucketId: 'test-bucket-id',
        bucketName: 'test-bucket-name',
      };

      expect(config.applicationKeyId).toBe('test-key-id');
      expect(config.applicationKey).toBe('test-key');
      expect(config.bucketId).toBe('test-bucket-id');
      expect(config.bucketName).toBe('test-bucket-name');
    });
  });

  describe('B2AuthResponse', () => {
    it('should define the correct structure', () => {
      const authResponse: B2AuthResponse = {
        accountId: 'account-123',
        authorizationToken: 'token-456',
        apiUrl: 'https://api.backblazeb2.com',
        downloadUrl: 'https://f000.backblazeb2.com',
      };

      expect(authResponse.accountId).toBe('account-123');
      expect(authResponse.authorizationToken).toBe('token-456');
      expect(authResponse.apiUrl).toBe('https://api.backblazeb2.com');
      expect(authResponse.downloadUrl).toBe('https://f000.backblazeb2.com');
    });
  });

  describe('B2UploadUrlResponse', () => {
    it('should define the correct structure', () => {
      const uploadUrlResponse: B2UploadUrlResponse = {
        bucketId: 'bucket-123',
        uploadUrl: 'https://pod-000-1234-05.backblaze.com',
        authorizationToken: 'upload-token-789',
      };

      expect(uploadUrlResponse.bucketId).toBe('bucket-123');
      expect(uploadUrlResponse.uploadUrl).toBe('https://pod-000-1234-05.backblaze.com');
      expect(uploadUrlResponse.authorizationToken).toBe('upload-token-789');
    });
  });

  describe('B2FileInfo', () => {
    it('should define the correct structure', () => {
      const fileInfo: B2FileInfo = {
        fileId: 'file-123',
        fileName: 'test.txt',
        contentType: 'text/plain',
        contentLength: 1024,
        contentSha1: 'sha1-hash-value',
        fileInfo: {
          customKey: 'customValue',
        },
      };

      expect(fileInfo.fileId).toBe('file-123');
      expect(fileInfo.fileName).toBe('test.txt');
      expect(fileInfo.contentType).toBe('text/plain');
      expect(fileInfo.contentLength).toBe(1024);
      expect(fileInfo.contentSha1).toBe('sha1-hash-value');
      expect(fileInfo.fileInfo.customKey).toBe('customValue');
    });
  });

  describe('B2UploadResponse', () => {
    it('should extend B2FileInfo with additional fields', () => {
      const uploadResponse: B2UploadResponse = {
        fileId: 'file-123',
        fileName: 'test.txt',
        contentType: 'text/plain',
        contentLength: 1024,
        contentSha1: 'sha1-hash-value',
        fileInfo: {},
        bucketId: 'bucket-123',
        uploadTimestamp: 1640995200000,
      };

      expect(uploadResponse.bucketId).toBe('bucket-123');
      expect(uploadResponse.uploadTimestamp).toBe(1640995200000);
      // Should also have all B2FileInfo properties
      expect(uploadResponse.fileId).toBe('file-123');
      expect(uploadResponse.fileName).toBe('test.txt');
    });
  });

  describe('B2DownloadResponse', () => {
    it('should define the correct structure', () => {
      const downloadResponse: B2DownloadResponse = {
        data: Buffer.from('test content'),
        contentType: 'text/plain',
        contentLength: 12,
        fileName: 'test.txt',
      };

      expect(downloadResponse.data).toBeInstanceOf(Buffer);
      expect(downloadResponse.data.toString()).toBe('test content');
      expect(downloadResponse.contentType).toBe('text/plain');
      expect(downloadResponse.contentLength).toBe(12);
      expect(downloadResponse.fileName).toBe('test.txt');
    });
  });

  describe('B2ListFilesResponse', () => {
    it('should define the correct structure', () => {
      const listFilesResponse: B2ListFilesResponse = {
        files: [
          {
            fileId: 'file-1',
            fileName: 'file1.txt',
            contentType: 'text/plain',
            contentLength: 100,
            contentSha1: 'hash1',
            fileInfo: {},
          },
          {
            fileId: 'file-2',
            fileName: 'file2.txt',
            contentType: 'text/plain',
            contentLength: 200,
            contentSha1: 'hash2',
            fileInfo: {},
          },
        ],
        nextFileName: 'file3.txt',
      };

      expect(listFilesResponse.files).toHaveLength(2);
      expect(listFilesResponse.files[0].fileId).toBe('file-1');
      expect(listFilesResponse.nextFileName).toBe('file3.txt');
    });

    it('should allow optional nextFileName', () => {
      const listFilesResponse: B2ListFilesResponse = {
        files: [],
      };

      expect(listFilesResponse.nextFileName).toBeUndefined();
    });
  });

  describe('UploadOptions', () => {
    it('should define all optional fields', () => {
      const uploadOptions: UploadOptions = {
        contentType: 'application/json',
        fileInfo: {
          customField: 'value',
        },
        onProgress: (progress: number) => {
          expect(typeof progress).toBe('number');
        },
      };

      expect(uploadOptions.contentType).toBe('application/json');
      expect(uploadOptions.fileInfo?.customField).toBe('value');
      expect(typeof uploadOptions.onProgress).toBe('function');
    });

    it('should allow empty options', () => {
      const uploadOptions: UploadOptions = {};

      expect(uploadOptions.contentType).toBeUndefined();
      expect(uploadOptions.fileInfo).toBeUndefined();
      expect(uploadOptions.onProgress).toBeUndefined();
    });
  });

  describe('DownloadOptions', () => {
    it('should define optional onProgress callback', () => {
      const downloadOptions: DownloadOptions = {
        onProgress: (progress: number) => {
          expect(typeof progress).toBe('number');
        },
      };

      expect(typeof downloadOptions.onProgress).toBe('function');
    });

    it('should allow empty options', () => {
      const downloadOptions: DownloadOptions = {};

      expect(downloadOptions.onProgress).toBeUndefined();
    });
  });

  describe('ArchiveOptions', () => {
    it('should define all optional fields', () => {
      const archiveOptions: ArchiveOptions = {
        compressionLevel: 5,
        includeMetadata: true,
      };

      expect(archiveOptions.compressionLevel).toBe(5);
      expect(archiveOptions.includeMetadata).toBe(true);
    });

    it('should allow empty options', () => {
      const archiveOptions: ArchiveOptions = {};

      expect(archiveOptions.compressionLevel).toBeUndefined();
      expect(archiveOptions.includeMetadata).toBeUndefined();
    });
  });
});