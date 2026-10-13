import { NextRequest, NextResponse } from "next/server";
import { createPresignedUploadUrl } from "@/lib/storage/r2Client";

// Permitted MIME types and their extensions
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "application/json": "json",
  "text/plain": "txt",
  "application/x-chess-pgn": "pgn",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, contentType, folder = "general", userId } = body;

    if (!contentType || !ALLOWED_MIME_TYPES[contentType]) {
      return NextResponse.json(
        {
          error: `Unsupported content-type '${contentType}'. Allowed types: ${Object.keys(
            ALLOWED_MIME_TYPES
          ).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const ext = ALLOWED_MIME_TYPES[contentType];
    const sanitizedFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "");
    const safeUser = userId ? userId.replace(/[^a-zA-Z0-9_-]/g, "") : "anonymous";
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 8);

    // E.g., avatars/user_123-1728876400000-a1b2c3.webp
    const key = `${sanitizedFolder}/${safeUser}-${timestamp}-${randomHex}.${ext}`;

    const presigned = await createPresignedUploadUrl(key, contentType, 300);

    return NextResponse.json({
      success: true,
      data: presigned,
    });
  } catch (error: any) {
    console.error("Presigned URL generation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create presigned URL" },
      { status: 500 }
    );
  }
}
