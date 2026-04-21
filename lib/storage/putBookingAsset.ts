import fs from "fs/promises";
import path from "path";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getStorageConfig, getStorageProvider } from "./config";

let s3Client: S3Client | null = null;

function getLocalPublicUrl(storageKey: string) {
  return `/${storageKey}`;
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, "");
}

function encodeStorageKey(storageKey: string) {
  return storageKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

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

export async function putBookingAsset({
  storageKey,
  body,
  contentType,
}: {
  storageKey: string;
  body: Buffer;
  contentType: string;
}): Promise<{ publicUrl: string }> {
  const provider = getStorageProvider();

  if (provider === "s3" || provider === "supabase") {
    const config = getStorageConfig();
    const bucket = provider === "supabase" ? config.supabase.bucket : config.s3.bucket;
    const publicUrl =
      provider === "supabase"
        ? `${normalizeBaseUrl(config.supabase.url)}/storage/v1/object/public/${bucket}/${encodeStorageKey(storageKey)}`
        : `${normalizeBaseUrl(config.publicBaseUrl)}/${storageKey}`;

    const configured =
      provider === "supabase"
        ? Boolean(config.supabase.region) &&
          Boolean(config.supabase.bucket) &&
          Boolean(config.supabase.endpoint) &&
          Boolean(config.supabase.accessKeyId) &&
          Boolean(config.supabase.secretAccessKey) &&
          Boolean(config.supabase.url)
        : Boolean(config.s3.region) &&
          Boolean(config.s3.bucket) &&
          Boolean(config.s3.accessKeyId) &&
          Boolean(config.s3.secretAccessKey) &&
          Boolean(config.publicBaseUrl);

    if (!configured) {
      throw new Error(
        provider === "supabase"
          ? "Supabase Storage is selected but not fully configured"
          : "Object storage is selected but not fully configured"
      );
    }

    const client = getS3Client();
    const uploader = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: storageKey,
        Body: body,
        ContentType: contentType,
      },
    });
    await uploader.done();

    return {
      publicUrl,
    };
  }

  const fullPath = path.join(process.cwd(), "public", storageKey);

  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, body);

  return {
    publicUrl: getLocalPublicUrl(storageKey),
  };
}
