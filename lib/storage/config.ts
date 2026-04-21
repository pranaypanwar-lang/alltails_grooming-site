type StorageProvider = "local" | "s3" | "supabase";

function toBool(value: string | undefined, fallback = false) {
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
  if (provider === "s3") return "s3";
  if (provider === "supabase") return "supabase";
  return "local";
}

export function getStorageConfig() {
  return {
    provider: getStorageProvider(),
    publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL?.trim() || "",
    s3: {
      region: process.env.STORAGE_S3_REGION?.trim() || "",
      bucket: process.env.STORAGE_S3_BUCKET?.trim() || "",
      endpoint: process.env.STORAGE_S3_ENDPOINT?.trim() || "",
      accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID?.trim() || "",
      secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY?.trim() || "",
      forcePathStyle: toBool(process.env.STORAGE_S3_FORCE_PATH_STYLE, false),
    },
    supabase: {
      url: process.env.SUPABASE_URL?.trim() || "",
      bucket: process.env.SUPABASE_STORAGE_BUCKET?.trim() || "",
      region: process.env.SUPABASE_STORAGE_REGION?.trim() || "",
      endpoint: process.env.SUPABASE_STORAGE_S3_ENDPOINT?.trim() || "",
      accessKeyId: process.env.SUPABASE_STORAGE_ACCESS_KEY_ID?.trim() || "",
      secretAccessKey: process.env.SUPABASE_STORAGE_SECRET_ACCESS_KEY?.trim() || "",
    },
  };
}

export function getStorageDiagnostics() {
  const config = getStorageConfig();
  if (config.provider === "local") {
    return {
      provider: "local" as const,
      configured: true,
      notes: "Using local filesystem storage under public/",
    };
  }

  const configured =
    Boolean(config.s3.region) &&
    Boolean(config.s3.bucket) &&
    Boolean(config.s3.accessKeyId) &&
    Boolean(config.s3.secretAccessKey) &&
    Boolean(config.publicBaseUrl);

  return {
    provider: "s3" as const,
      configured,
      notes: configured
      ? "S3-compatible object storage configured"
      : "Missing one or more S3/object storage environment variables",
  };

  const supabaseConfigured =
    Boolean(config.supabase.url) &&
    Boolean(config.supabase.bucket) &&
    Boolean(config.supabase.region) &&
    Boolean(config.supabase.endpoint) &&
    Boolean(config.supabase.accessKeyId) &&
    Boolean(config.supabase.secretAccessKey);

  return {
    provider: "supabase" as const,
    configured: supabaseConfigured,
    notes: supabaseConfigured
      ? "Supabase Storage S3 endpoint configured"
      : "Missing one or more Supabase Storage environment variables",
  };
}
