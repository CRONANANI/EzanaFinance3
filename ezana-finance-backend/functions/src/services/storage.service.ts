import { storage } from "../config/firebase";

/**
 * File Storage Service
 * Uses Firebase Storage (included). For production at scale,
 * migrate to Azure Blob Storage or AWS S3 / Cloudflare R2.
 *
 * Azure Blob: $0.02/GB/month
 * AWS S3: $0.023/GB/month
 * Cloudflare R2: $0.015/GB/month (no egress fees)
 */
class StorageService {
  private bucket = storage.bucket();

  async uploadFile(
    fileBuffer: Buffer,
    filePath: string,
    contentType: string
  ): Promise<string> {
    const file = this.bucket.file(filePath);
    await file.save(fileBuffer, {
      metadata: { contentType },
      public: false,
    });
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    return url;
  }

  async uploadUserAvatar(userId: string, buffer: Buffer, ext: string): Promise<string> {
    const path = `users/${userId}/avatar.${ext}`;
    return this.uploadFile(buffer, path, `image/${ext}`);
  }

  async uploadReport(userId: string, reportName: string, buffer: Buffer): Promise<string> {
    const path = `users/${userId}/reports/${reportName}`;
    return this.uploadFile(buffer, path, "application/pdf");
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await this.bucket.file(filePath).delete();
    } catch (error) {
      console.error("Delete file error:", error);
    }
  }

  async getDownloadUrl(filePath: string, expiresInHours = 24): Promise<string> {
    const [url] = await this.bucket.file(filePath).getSignedUrl({
      action: "read",
      expires: Date.now() + expiresInHours * 60 * 60 * 1000,
    });
    return url;
  }
}

export default new StorageService();
