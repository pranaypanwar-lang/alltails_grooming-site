import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client } from "@aws-sdk/client-s3";
import { getStorageConfig, getStorageProvider } from "./config";

let s3Client: S3Client | null = null;

function getS3Client() {
  if (s3Client) return s3Client;
  const config = getStorageConfig();
  const isSupabase = config.provider === "supabase";
  s3Client = new S3Client(
    isSupabase
      ? {
          region: config.supabase.region,
          endpoint: config.supabase.endpoint,
          forcePathStyle: true,
          credentials: {
            accessKeyId: config.supabase.accessKeyId,
            secretAccessKey: config.supabase.secretAccessKey,
          },
        }
      : {
          region: config.s3.region,
          endpoint: config.s3.endpoint || undefined,
          forcePathStyle: config.s3.forcePathStyle,
          credentials: {
            accessKeyId: config.s3.accessKeyId,
            secretAccessKey: config.s3.secretAccessKey,
          },
        }
  );
  return s3Client;
}

function normalizeBaseUrl(v: string) {
  return v.replace(/\/$/, "");
}

function encodeStorageKey(storageKey: string) {
  return storageKey
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
}

export async function presignPutUrl({
  storageKey,
  contentType,
  expiresIn = 300,
}: {
  storageKey: string;
  contentType: string;
  expiresIn?: number;
}): Promise<{ uploadUrl: string; publicUrl: string }> {
  const provider = getStorageProvider();
  const config = getStorageConfig();

  if (provider !== "s3" && provider !== "supabase") {
    throw new Error("Presigned URLs are only supported with S3 / Supabase storage");
  }

  const bucket = provider === "supabase" ? config.supabase.bucket : config.s3.bucket;
  const publicUrl =
    provider === "supabase"
      ? `${normalizeBaseUrl(config.supabase.url)}/storage/v1/object/public/${bucket}/${encodeStorageKey(storageKey)}`
      : `${normalizeBaseUrl(config.publicBaseUrl)}/${storageKey}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn });
  return { uploadUrl, publicUrl };
}
