declare module 'backblaze-b2' {
  interface B2Config {
    applicationKeyId: string;
    applicationKey: string;
  }

  interface AuthorizeResponse {
    data: {
      authorizationToken: string;
      apiUrl: string;
      downloadUrl: string;
      recommendedPartSize: number;
    };
  }

  interface GetUploadUrlResponse {
    data: {
      uploadUrl: string;
      authorizationToken: string;
    };
  }

  interface UploadFileResponse {
    data: {
      fileId: string;
      fileName: string;
      contentLength: number;
      contentSha1: string;
      contentType: string;
      fileInfo: Record<string, string>;
    };
  }

  class B2 {
    constructor(config: B2Config);
    authorize(): Promise<AuthorizeResponse>;
    getUploadUrl(options: { bucketId: string }): Promise<GetUploadUrlResponse>;
    uploadFile(options: {
      uploadUrl: string;
      uploadAuthToken: string;
      fileName: string;
      data: Buffer;
      mime?: string;
      contentType?: string;
      contentLength?: number;
      hash?: string;
      info?: Record<string, string>;
      onUploadProgress?: (progress: { percent: number; bytesDispatched: number; bytesTotal: number }) => void;
    }): Promise<UploadFileResponse>;
    downloadFileByName(options: {
      bucketName: string;
      fileName: string;
      responseType?: string;
    }): Promise<any>;
    listBuckets(options?: { bucketName?: string; bucketTypes?: string[] }): Promise<any>;
    listFileNames(options: { bucketId: string; maxFileCount?: number; prefix?: string; startFileName?: string; delimiter?: string }): Promise<any>;
    getFileInfo(options: { fileId: string }): Promise<any>;
    deleteFileVersion(options: { fileId: string; fileName: string }): Promise<any>;
    getDownloadAuthorization(options: { bucketId: string; fileNamePrefix: string; validDurationInSeconds: number }): Promise<any>;
    createBucket(options: { bucketName: string; bucketType: string }): Promise<any>;
    deleteBucket(options: { bucketId: string }): Promise<any>;
    updateBucket(options: { bucketId: string; bucketType: string }): Promise<any>;
    getLargeFileUploadState(options: { fileId: string }): Promise<any>;
    startLargeFile(options: { bucketId: string; fileName: string; contentType?: string }): Promise<any>;
    getUploadPartUrl(options: { fileId: string }): Promise<any>;
    uploadPart(options: any): Promise<any>;
    finishLargeFile(options: { fileId: string; partSha1Array: string[] }): Promise<any>;
    cancelLargeFile(options: { fileId: string }): Promise<any>;
  }

  export = B2;
}
