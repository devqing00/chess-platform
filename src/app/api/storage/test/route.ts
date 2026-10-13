import { NextResponse } from "next/server";
import { listR2Buckets } from "@/lib/storage/r2Client";

export async function GET() {
  try {
    const buckets = await listR2Buckets();
    return NextResponse.json({
      success: true,
      message: "Connected to Cloudflare R2 successfully!",
      buckets: buckets.map((b) => ({
        name: b.Name,
        creationDate: b.CreationDate,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to connect to Cloudflare R2",
      },
      { status: 500 }
    );
  }
}
