import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: "https://e23eac93f3396a68563e3ae60a9e2743.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "da43ccf4dbff5cdb53d30ca0482641e5",
    secretAccessKey: "c6bf0919fd7d7c2e4011adb00ad17582e6dd261f91167cde1d7427cc54259add",
  },
});

async function run() {
  try {
    console.log("Connecting to Cloudflare R2...");
    const res = await client.send(new ListBucketsCommand({}));
    console.log("Success! Buckets found:", res.Buckets);
  } catch (err) {
    console.error("R2 Connection Error:", err);
  }
}

run();
