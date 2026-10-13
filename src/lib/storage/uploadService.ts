/**
 * Client-Side Cloudflare R2 Upload Service
 * Direct browser-to-edge uploads with zero server bandwidth load.
 */

export interface UploadOptions {
  folder?: "avatars" | "pgn" | "replays" | "themes" | "general";
  userId?: string;
  onProgress?: (percentage: number) => void;
}

export interface UploadResult {
  publicUrl: string;
  key: string;
  bucket: string;
}

export class R2UploadService {
  /**
   * Uploads any File or Blob directly to Cloudflare R2 using a short-lived presigned URL.
   */
  static async uploadFile(
    file: File | Blob,
    filename: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const { folder = "general", userId, onProgress } = options;
    const contentType = file.type || "application/octet-stream";

    // 1. Request presigned upload URL from our Next.js API
    const presignRes = await fetch("/api/storage/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        contentType,
        folder,
        userId,
      }),
    });

    if (!presignRes.ok) {
      const err = await presignRes.json().catch(() => ({}));
      throw new Error(err.error || `Presign failed with status ${presignRes.status}`);
    }

    const { data } = await presignRes.json();
    const { uploadUrl, publicUrl, key, bucket } = data;

    // 2. Direct upload to R2 via PUT with progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", contentType);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) onProgress(100);
          resolve();
        } else {
          reject(new Error(`R2 upload rejected with status ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during Cloudflare R2 upload"));
      };

      xhr.send(file);
    });

    return {
      publicUrl,
      key,
      bucket,
    };
  }

  /**
   * Dedicated helper for user profile avatar uploads with client-side image validation
   */
  static async uploadAvatar(
    file: File,
    userId: string,
    onProgress?: (pct: number) => void
  ): Promise<string> {
    // Validate image format
    const validFormats = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validFormats.includes(file.type)) {
      throw new Error("Invalid image format. Please select JPEG, PNG, WEBP, or GIF.");
    }

    // Limit avatar size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File is too large. Avatars must be under 5MB.");
    }

    const result = await this.uploadFile(file, file.name, {
      folder: "avatars",
      userId,
      onProgress,
    });

    return result.publicUrl;
  }
}
