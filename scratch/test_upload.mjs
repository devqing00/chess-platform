import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

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
    console.log("Uploading test file to chess-platform-storage...");
    await client.send(
      new PutObjectCommand({
        Bucket: "chess-platform-storage",
        Key: "healthcheck/test.txt",
        Body: "Cloudflare R2 storage operational for Chess Platform!",
        ContentType: "text/plain",
      })
    );
    console.log("Upload successful!");

    const getRes = await client.send(
      new GetObjectCommand({
        Bucket: "chess-platform-storage",
        Key: "healthcheck/test.txt",
      })
    );
    const text = await getRes.Body.transformToString();
    console.log("Read object back successfully:", text);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

run();
