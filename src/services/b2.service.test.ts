import { vi, Mock } from 'vitest';
import { jest } from '@jest/globals';
import axios from 'axios';
import { B2Service } from './b2.service.js';
import {
  B2Config,
  B2AuthResponse,
  B2UploadUrlResponse,
  B2UploadResponse,
} from '../types/b2.types.js';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as Mock<typeof axios>;

describe('B2Service', () => {
  let b2Service: B2Service;
  let mockConfig: B2Config;
  let mockAxiosInstance: Mock<any>;

  beforeEach(() => {
    mockConfig = {
      applicationKeyId: 'test-key-id',
      applicationKey: 'test-key',
      bucketId: 'test-bucket-id',
      bucketName: 'test-bucket',
    };

    mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn(),
    };

    mockedAxios.create = vi.fn().mockReturnValue(mockAxiosInstance);
    b2Service = new B2Service(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should authenticate with B2 API', async () => {
      const mockAuthResponse: B2AuthResponse = {
        accountId: 'test-account',
        authorizationToken: 'test-token',
        apiUrl: 'https://api.test.com',
        downloadUrl: 'https://download.test.com',
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockAuthResponse,
      });

      // Access private method via any cast for testing
      const authInfo = await (b2Service as any).authenticate();

      expect(authInfo).toEqual(mockAuthResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://api.backblazeb2.com/b2api/v2/b2_authorize_account',
        {},
        {
          headers: {
            Authorization: expect.stringMatching(/^Basic /),
          },
        }
      );
    });

    it('should cache authentication response', async () => {
      const mockAuthResponse: B2AuthResponse = {
        accountId: 'test-account',
        authorizationToken: 'test-token',
        apiUrl: 'https://api.test.com',
        downloadUrl: 'https://download.test.com',
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockAuthResponse,
      });

      await (b2Service as any).authenticate();
      await (b2Service as any).authenticate();

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('should handle authentication errors', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Auth failed'));

      await expect((b2Service as any).authenticate()).rejects.toThrow(
        'B2 authentication failed: Error: Auth failed'
      );
    });
  });

  describe('Upload URL', () => {
    beforeEach(() => {
      const mockAuthResponse: B2AuthResponse = {
        accountId: 'test-account',
        authorizationToken: 'test-token',
        apiUrl: 'https://api.test.com',
        downloadUrl: 'https://download.test.com',
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockAuthResponse })
        .mockResolvedValueOnce({
          data: {
            bucketId: mockConfig.bucketId,
            uploadUrl: 'https://upload.test.com',
            authorizationToken: 'upload-token',
          },
        });
    });

    it('should get upload URL', async () => {
      const uploadUrlInfo = await (b2Service as any).getUploadUrl();

      expect(uploadUrlInfo).toEqual({
        bucketId: mockConfig.bucketId,
        uploadUrl: 'https://upload.test.com',
        authorizationToken: 'upload-token',
      });
    });

    it('should cache upload URL', async () => {
      await (b2Service as any).getUploadUrl();
      await (b2Service as any).getUploadUrl();

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2); // 1 for auth, 1 for upload URL
    });
  });

  describe('File Upload', () => {
    beforeEach(() => {
      const mockAuthResponse: B2AuthResponse = {
        accountId: 'test-account',
        authorizationToken: 'test-token',
        apiUrl: 'https://api.test.com',
        downloadUrl: 'https://download.test.com',
      };

      const mockUploadUrlResponse: B2UploadUrlResponse = {
        bucketId: mockConfig.bucketId,
        uploadUrl: 'https://upload.test.com',
        authorizationToken: 'upload-token',
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockAuthResponse })
        .mockResolvedValueOnce({ data: mockUploadUrlResponse });
    });

    it('should upload file successfully', async () => {
      const fileName = 'test.txt';
      const fileData = Buffer.from('test content');
      const mockUploadResponse: B2UploadResponse = {
        fileId: 'file-123',
        fileName,
        contentType: 'text/plain',
        contentLength: fileData.length,
        contentSha1: 'sha1-hash',
        fileInfo: {},
        bucketId: mockConfig.bucketId,
        uploadTimestamp: Date.now(),
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockUploadResponse,
      });

      const result = await b2Service.uploadFile(fileName, fileData, {
        contentType: 'text/plain',
      });

      expect(result).toEqual(mockUploadResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://upload.test.com',
        fileData,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Bz-File-Name': encodeURIComponent(fileName),
            'Content-Type': 'text/plain',
          }),
        })
      );
    });

    it('should handle upload errors', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Upload failed'));

      const fileName = 'test.txt';
      const fileData = Buffer.from('test content');

      await expect(b2Service.uploadFile(fileName, fileData)).rejects.toThrow(
        'File upload failed: Error: Upload failed'
      );
    });
  });

  describe('File Download', () => {
    beforeEach(() => {
      const mockAuthResponse: B2AuthResponse = {
        accountId: 'test-account',
        authorizationToken: 'test-token',
        apiUrl: 'https://api.test.com',
        downloadUrl: 'https://download.test.com',
      };

      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockAuthResponse });
    });

    it('should download file successfully', async () => {
      const fileName = 'test.txt';
      const fileData = Buffer.from('test content');

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: fileData,
        headers: {
          'content-type': 'text/plain',
          'content-length': fileData.length.toString(),
        },
      });

      const result = await b2Service.downloadFile(fileName);

      expect(result.data).toEqual(fileData);
      expect(result.contentType).toBe('text/plain');
      expect(result.fileName).toBe(fileName);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `https://download.test.com/file/${mockConfig.bucketName}/${encodeURIComponent(fileName)}`,
        expect.objectContaining({
          responseType: 'arraybuffer',
        })
      );
    });

    it('should download file by ID successfully', async () => {
      const fileId = 'file-123';
      const fileName = 'test.txt';
      const fileData = Buffer.from('test content');

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: fileData,
        headers: {
          'content-type': 'text/plain',
          'content-length': fileData.length.toString(),
          'x-bz-file-name': fileName,
        },
      });

      const result = await b2Service.downloadFileById(fileId);

      expect(result.data).toEqual(fileData);
      expect(result.fileName).toBe(fileName);
    });

    it('should handle download errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Download failed'));

      await expect(b2Service.downloadFile('test.txt')).rejects.toThrow(
        'File download failed: Error: Download failed'
      );
    });
  });

  describe('File Listing', () => {
    beforeEach(() => {
      const mockAuthResponse: B2AuthResponse = {
        accountId: 'test-account',
        authorizationToken: 'test-token',
        apiUrl: 'https://api.test.com',
        downloadUrl: 'https://download.test.com',
      };

      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockAuthResponse });
    });

    it('should list files successfully', async () => {
      const mockListResponse = {
        files: [
          {
            fileId: 'file-1',
            fileName: 'test1.txt',
            contentType: 'text/plain',
            contentLength: 100,
            contentSha1: 'sha1-hash-1',
            fileInfo: {},
          },
        ],
        nextFileName: 'test2.txt',
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockListResponse,
      });

      const result = await b2Service.listFiles();

      expect(result).toEqual(mockListResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://api.test.com/b2api/v2/b2_list_file_names',
        {
          bucketId: mockConfig.bucketId,
          startFileName: undefined,
          maxFileCount: 100,
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'test-token',
          }),
        })
      );
    });
  });

  describe('File Deletion', () => {
    beforeEach(() => {
      const mockAuthResponse: B2AuthResponse = {
        accountId: 'test-account',
        authorizationToken: 'test-token',
        apiUrl: 'https://api.test.com',
        downloadUrl: 'https://download.test.com',
      };

      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockAuthResponse });
    });

    it('should delete file successfully', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: {} });

      await expect(
        b2Service.deleteFile('test.txt', 'file-123')
      ).resolves.not.toThrow();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://api.test.com/b2api/v2/b2_delete_file_version',
        {
          fileName: 'test.txt',
          fileId: 'file-123',
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'test-token',
          }),
        })
      );
    });
  });

  describe('Parallel Upload', () => {
    it('should upload multiple files in parallel', async () => {
      // Mock the auth and upload URL responses
      const mockAuthResponse: B2AuthResponse = {
        accountId: 'test-account',
        authorizationToken: 'test-token',
        apiUrl: 'https://api.test.com',
        downloadUrl: 'https://download.test.com',
      };

      const mockUploadUrlResponse: B2UploadUrlResponse = {
        bucketId: mockConfig.bucketId,
        uploadUrl: 'https://upload.test.com',
        authorizationToken: 'upload-token',
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockAuthResponse })
        .mockResolvedValueOnce({ data: mockUploadUrlResponse })
        .mockResolvedValue({
          data: {
            fileId: 'file-123',
            fileName: 'test.txt',
            contentType: 'text/plain',
            contentLength: 100,
            contentSha1: 'sha1-hash',
            fileInfo: {},
            bucketId: mockConfig.bucketId,
            uploadTimestamp: Date.now(),
          },
        });

      const files = [
        { fileName: 'file1.txt', data: Buffer.from('content1') },
        { fileName: 'file2.txt', data: Buffer.from('content2') },
        { fileName: 'file3.txt', data: Buffer.from('content3') },
      ];

      const results = await b2Service.uploadFiles(files, 2);

      expect(results).toHaveLength(3);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(5); // 1 auth + 1 upload URL + 3 uploads
    });
  });

  describe('Archive Management', () => {
    beforeEach(() => {
      const mockAuthResponse: B2AuthResponse = {
        accountId: 'test-account',
        authorizationToken: 'test-token',
        apiUrl: 'https://api.test.com',
        downloadUrl: 'https://download.test.com',
      };

      const mockUploadUrlResponse: B2UploadUrlResponse = {
        bucketId: mockConfig.bucketId,
        uploadUrl: 'https://upload.test.com',
        authorizationToken: 'upload-token',
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockAuthResponse })
        .mockResolvedValueOnce({ data: mockUploadUrlResponse });
    });

    it('should create and upload archive', async () => {
      const mockUploadResponse: B2UploadResponse = {
        fileId: 'archive-123',
        fileName: 'archive.tar',
        contentType: 'application/x-archive',
        contentLength: 1000,
        contentSha1: 'archive-hash',
        fileInfo: { archive: 'true', fileCount: '2' },
        bucketId: mockConfig.bucketId,
        uploadTimestamp: Date.now(),
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockUploadResponse,
      });

      const files = [
        { fileName: 'file1.txt', data: Buffer.from('content1') },
        { fileName: 'file2.txt', data: Buffer.from('content2') },
      ];

      const result = await b2Service.createArchive('archive.tar', files);

      expect(result).toEqual(mockUploadResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        'https://upload.test.com',
        expect.any(Buffer),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-archive',
          }),
        })
      );
    });

    it('should extract files from archive', async () => {
      const files = [
        { fileName: 'file1.txt', data: Buffer.from('content1') },
        { fileName: 'file2.txt', data: Buffer.from('content2') },
      ];

      // Create an archive first
      const archiveData = (b2Service as any).createSimpleArchive(files, {});

      // Extract files from the archive
      const extractedFiles = await b2Service.extractArchive(archiveData);

      expect(extractedFiles).toHaveLength(2);
      expect(extractedFiles[0].fileName).toBe('file1.txt');
      expect(extractedFiles[0].data.toString()).toBe('content1');
      expect(extractedFiles[1].fileName).toBe('file2.txt');
      expect(extractedFiles[1].data.toString()).toBe('content2');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      b2Service.clearCache();

      // Verify that internal cache is cleared by checking if auth is called again
      expect((b2Service as any).authInfo).toBeNull();
      expect((b2Service as any).uploadUrl).toBeNull();
    });
  });

  describe('SHA1 Calculation', () => {
    it('should calculate SHA1 hash correctly', () => {
      const data = Buffer.from('test content');
      const sha1Hash = (b2Service as any).calculateSha1(data);

      expect(typeof sha1Hash).toBe('string');
      expect(sha1Hash).toHaveLength(40); // SHA1 hash is 40 characters
    });
  });
});